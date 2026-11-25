import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { SpeechAnalysisMetadata, SpeechAnalysisOptions } from "@emk/media-metadata-core";
import { buildSpeechAnalysis } from "./build-speech-analysis";
import { extractSpeechWav, wavDurationMs } from "./extract-speech-wav";
import { parseWhisperCliJson, type ParsedWhisperTranscript } from "./parse-whisper-json";
import { runWhisperCli } from "./run-whisper-cli";
import { isSpeechModelStubbed } from "./ensure-speech-model";
import { whisperLanguageArg } from "./speech-language";
import type { SpeechModelFiles } from "./speech-model-paths";
import {
  isStubNoVoice,
  isStubSpeechFailure,
  STUB_WHISPER_DURATION_MS,
  STUB_WHISPER_JSON,
} from "./stub-whisper-json";

interface TranscriptResult {
  parsed: ParsedWhisperTranscript;
  durationMs: number;
  hasAudio: boolean;
}

export async function transcribeVideoFile(input: {
  videoPath: string;
  files: SpeechModelFiles;
  options: SpeechAnalysisOptions;
  includeSilenceSpans: boolean;
  fillerLexicon: string;
  language: string;
  signal?: AbortSignal;
}): Promise<SpeechAnalysisMetadata> {
  const transcript = isSpeechModelStubbed()
    ? await stubTranscript(input.videoPath, input.signal)
    : await transcribeWithWhisper(input.videoPath, input.files, input.options, input.language, input.signal);
  return buildSpeechAnalysis({
    transcript: transcript.parsed,
    durationMs: transcript.durationMs,
    hasAudio: transcript.hasAudio,
    processedAt: new Date().toISOString(),
    options: input.options,
    includeSilenceSpans: input.includeSilenceSpans,
    fillerLexicon: input.fillerLexicon,
  });
}

async function stubTranscript(videoPath: string, signal: AbortSignal | undefined): Promise<TranscriptResult> {
  await stubDelay(signal);
  if (isStubSpeechFailure(videoPath)) {
    throw new Error("Stub speech failure");
  }
  if (isStubNoVoice(videoPath)) {
    return { parsed: { language: null, segments: [] }, durationMs: STUB_WHISPER_DURATION_MS, hasAudio: true };
  }
  return { parsed: parseWhisperCliJson(STUB_WHISPER_JSON), durationMs: STUB_WHISPER_DURATION_MS, hasAudio: true };
}

function stubDelay(signal: AbortSignal | undefined): Promise<void> {
  const delayMs = Number(process.env.EMK_E2E_SPEECH_STUB_DELAY_MS ?? 0);
  if (!Number.isFinite(delayMs) || delayMs <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new Error("Speech transcription cancelled"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    if (signal?.aborted) onAbort();
    else signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function transcribeWithWhisper(
  videoPath: string,
  files: SpeechModelFiles,
  options: SpeechAnalysisOptions,
  language: string,
  signal: AbortSignal | undefined,
): Promise<TranscriptResult> {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "emk-speech-"));
  const wavPath = path.join(workDir, "audio.wav");
  const outputBase = path.join(workDir, "transcript");
  try {
    const wav = await extractSpeechWav(videoPath, wavPath, signal);
    if (!wav.hasAudio) {
      return { parsed: { language: null, segments: [] }, durationMs: 0, hasAudio: false };
    }
    const durationMs = wavDurationMs(wavPath);
    const raw = await runWhisperCli({
      files,
      wavPath,
      outputBase,
      wordTimestamps: options.word_timestamps || options.filler_detection,
      silenceMinMs: options.silence_min_ms,
      language: whisperLanguageArg(language),
      signal,
    });
    return { parsed: parseWhisperCliJson(raw), durationMs, hasAudio: true };
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}
