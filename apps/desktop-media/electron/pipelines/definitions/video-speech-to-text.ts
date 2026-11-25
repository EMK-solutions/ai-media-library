import path from "node:path";
import { app } from "electron";
import type { SpeechAnalysisOptions } from "@emk/media-metadata-core";
import { resolveModelsPath } from "../../app-paths";
import { getSpeechAnalyzedPaths, markSpeechAnalysisFailed, upsertSpeechAnalysisResult } from "../../db/speech-analysis-store";
import { listFolderVideos } from "../../fs-media";
import { collectFoldersRecursivelyWithProgress, ensureCatalogForImagesWithProgress } from "../../ipc/folder-utils";
import { ensureWhisperCompanionFiles, listWhisperRuntimeFiles } from "../../speech/install-whisper-binary";
import { speechModelFilesReady, speechModelFilesIn } from "../../speech/speech-model-paths";
import { SPEECH_MODEL_ID } from "../../speech/build-speech-analysis";
import { DEFAULT_SPEECH_LANGUAGE, whisperLanguageArg } from "../../speech/speech-language";
import { transcribeVideoFile } from "../../speech/transcribe-video";
import { readSettings } from "../../storage";
import { DEFAULT_SPEECH_ANALYSIS_SETTINGS } from "../../../src/shared/ipc";
import type { PipelineDefinition } from "../pipeline-registry";

export interface VideoSpeechToTextParams {
  folderPath: string;
  recursive?: boolean;
  mode?: "missing" | "all";
  wordTimestamps?: boolean;
  includeSilenceSpans?: boolean;
  silenceMinMs?: number;
  fillerDetection?: boolean;
  fillerWords?: string;
  language?: string;
}

interface VideoSpeechSummary {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  withoutVoice: number;
}

function validateParams(params: unknown):
  | { ok: true; value: VideoSpeechToTextParams }
  | { ok: false; issues: string } {
  if (typeof params !== "object" || params === null) {
    return { ok: false, issues: "params must be an object" };
  }
  const candidate = params as Record<string, unknown>;
  const folderPath = typeof candidate.folderPath === "string" ? candidate.folderPath.trim() : "";
  if (!folderPath) return { ok: false, issues: "folderPath is required" };
  return {
    ok: true,
    value: {
      folderPath,
      recursive: candidate.recursive === true,
      mode: candidate.mode === "all" ? "all" : "missing",
      wordTimestamps: typeof candidate.wordTimestamps === "boolean" ? candidate.wordTimestamps : undefined,
      includeSilenceSpans:
        typeof candidate.includeSilenceSpans === "boolean" ? candidate.includeSilenceSpans : undefined,
      silenceMinMs: typeof candidate.silenceMinMs === "number" ? candidate.silenceMinMs : undefined,
      fillerDetection: typeof candidate.fillerDetection === "boolean" ? candidate.fillerDetection : undefined,
      fillerWords: typeof candidate.fillerWords === "string" ? candidate.fillerWords : undefined,
      language: typeof candidate.language === "string" ? candidate.language : undefined,
    },
  };
}

export const videoSpeechToTextDefinition: PipelineDefinition<VideoSpeechToTextParams, VideoSpeechSummary> = {
  id: "video-speech-to-text",
  displayName: "Video speech to text",
  concurrencyGroup: "speech",
  validateParams,
  run: async (ctx, params) => {
    const files = speechModelFilesIn(resolveModelsPath(app));
    await ensureWhisperCompanionFiles(files);
    const runtimeFiles = await listWhisperRuntimeFiles(files.binaryPath);
    console.log("[speech] model files", {
      binaryPath: files.binaryPath,
      modelPath: files.modelPath,
      vadPath: files.vadPath,
      runtimeFiles,
    });
    if (!speechModelFilesReady(files)) {
      throw new Error("Speech model is not ready. Enable Video speech to text in Settings and wait for the download.");
    }
    if (process.platform === "win32" && !runtimeFiles.some((name) => name.toLowerCase().endsWith(".dll"))) {
      console.error(
        "[speech] whisper-cli.exe has no DLL files beside it. Transcription will fail until you choose Download again in Settings.",
      );
    }
    const settings = await readSpeechOptions(params);
    const folders = params.recursive
      ? await collectFoldersRecursivelyWithProgress(params.folderPath)
      : [params.folderPath];
    const videos: Array<{ path: string; name: string }> = [];
    for (const folder of folders) {
      const listed = await listFolderVideos(folder);
      videos.push(...listed.map((item) => ({ path: item.path, name: item.name })));
    }
    await ensureCatalogForImagesWithProgress(videos.map((video) => video.path));
    const already = params.mode === "all" ? new Set<string>() : getSpeechAnalyzedPaths(videos.map((video) => video.path));
    const pending = videos.filter((video) => !already.has(video.path));
    let completed = 0;
    let failed = 0;
    let withoutVoice = 0;
    const skipped = videos.length - pending.length;
    const counts = (): Record<string, number> => ({ skipped, failed, completed, withoutVoice });
    ctx.report({
      type: "started",
      total: videos.length,
      message: skipped > 0 ? `Skipping ${skipped} already transcribed videos` : "Transcribing videos",
      details: counts(),
    });
    for (const video of pending) {
      if (ctx.signal.aborted) break;
      const firstFile = completed + failed === 0;
      ctx.report({
        type: "item-updated",
        message: `Transcribing: ${video.name}`,
        details: {
          ...counts(),
          currentFile: video.path,
          ...(firstFile ? { loadingModel: SPEECH_MODEL_ID } : {}),
        },
      });
      try {
        const analysis = await transcribeVideoFile({
          videoPath: video.path,
          files,
          options: settings.options,
          includeSilenceSpans: settings.includeSilenceSpans,
          fillerLexicon: settings.fillerWords,
          language: settings.language,
          signal: ctx.signal,
        });
        upsertSpeechAnalysisResult(video.path, analysis);
        completed += 1;
        if (!analysis.has_speech) withoutVoice += 1;
        ctx.report({
          type: "item-updated",
          processed: skipped + completed + failed,
          total: videos.length,
          message: path.basename(video.path),
          details: { ...counts(), path: video.path, currentFile: video.path },
        });
      } catch (error) {
        if (ctx.signal.aborted) break;
        failed += 1;
        const message = error instanceof Error ? error.message : "Speech transcription failed";
        console.error("[speech] failed", video.path, message);
        markSpeechAnalysisFailed(video.path, message);
        ctx.report({
          type: "item-updated",
          processed: skipped + completed + failed,
          total: videos.length,
          message,
          details: { ...counts(), path: video.path, currentFile: video.path, error: message },
        });
      }
    }
    return { total: videos.length, completed, failed, skipped, withoutVoice };
  },
};

async function readSpeechOptions(params: VideoSpeechToTextParams): Promise<{
  options: SpeechAnalysisOptions;
  includeSilenceSpans: boolean;
  fillerWords: string;
  language: string;
}> {
  const stored = (await readSettings(app.getPath("userData"))).speechAnalysis ?? DEFAULT_SPEECH_ANALYSIS_SETTINGS;
  const silenceMinMs = clampSilence(params.silenceMinMs ?? stored.silenceMinMs);
  return {
    includeSilenceSpans: params.includeSilenceSpans ?? stored.includeSilenceSpans,
    fillerWords: params.fillerWords ?? stored.fillerWords,
    language: whisperLanguageArg(params.language ?? stored.language ?? DEFAULT_SPEECH_LANGUAGE),
    options: {
      word_timestamps: params.wordTimestamps ?? stored.wordTimestamps,
      silence_min_ms: silenceMinMs,
      filler_detection: params.fillerDetection ?? stored.fillerDetection,
    },
  };
}

function clampSilence(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SPEECH_ANALYSIS_SETTINGS.silenceMinMs;
  return Math.max(0, Math.min(60_000, Math.round(value)));
}
