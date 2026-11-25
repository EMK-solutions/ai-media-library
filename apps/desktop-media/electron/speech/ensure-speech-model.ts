import fs from "node:fs";
import path from "node:path";
import { downloadFile } from "./download-file";
import { downloadPercent, installWhisperBinary } from "./install-whisper-binary";
import {
  SPEECH_MODEL_URL,
  SPEECH_VAD_URL,
  speechModelFilesReady,
  type SpeechModelFiles,
} from "./speech-model-paths";

export type SpeechModelPhase = "downloading" | "loading-cache" | "ready";

export interface SpeechModelProgress {
  phase: SpeechModelPhase;
  percent: number;
  message: string;
}

export function isSpeechModelStubbed(): boolean {
  return process.env.EMK_E2E_SPEECH_MODEL_STUB === "1";
}

export async function ensureSpeechModel(options: {
  files: SpeechModelFiles;
  forceRefresh?: boolean;
  signal?: AbortSignal;
  onProgress?: (progress: SpeechModelProgress) => void;
}): Promise<void> {
  const report = options.onProgress ?? (() => undefined);
  if (isSpeechModelStubbed()) {
    if (speechModelFilesReady(options.files) && options.forceRefresh !== true) {
      report({ phase: "loading-cache", percent: 100, message: "Using local speech model" });
      report({ phase: "ready", percent: 100, message: "Speech model ready" });
      return;
    }
    report({ phase: "downloading", percent: 30, message: "Downloading speech model (~600 MB)…" });
    await writeStubSpeechFiles(options.files);
    report({ phase: "ready", percent: 100, message: "Speech model ready" });
    return;
  }
  if (speechModelFilesReady(options.files) && options.forceRefresh !== true) {
    report({ phase: "loading-cache", percent: 100, message: "Using local speech model" });
    report({ phase: "ready", percent: 100, message: "Speech model ready" });
    return;
  }
  await fs.promises.mkdir(options.files.rootDir, { recursive: true });
  if (options.forceRefresh === true) {
    await Promise.all(
      [options.files.binaryPath, options.files.modelPath, options.files.vadPath].map((filePath) =>
        fs.promises.rm(filePath, { force: true }),
      ),
    );
  }
  report({ phase: "downloading", percent: 1, message: "Downloading speech model (~600 MB)…" });
  await downloadMissingPieces(options.files, options.signal, (percent) => {
    report({ phase: "downloading", percent, message: "Downloading speech model (~600 MB)…" });
  });
  if (!speechModelFilesReady(options.files)) {
    throw new Error("Speech model download finished without a usable whisper.cpp binary and weights.");
  }
  report({ phase: "ready", percent: 100, message: "Speech model ready" });
}

async function downloadMissingPieces(
  files: SpeechModelFiles,
  signal: AbortSignal | undefined,
  onPercent: (percent: number) => void,
): Promise<void> {
  if (!fileReady(files.binaryPath) || process.env.WHISPER_CPP_PATH?.trim()) {
    if (!process.env.WHISPER_CPP_PATH?.trim()) {
      await installWhisperBinary(files, signal, onPercent);
    }
  }
  if (!fileReady(files.modelPath)) {
    await downloadFile({
      url: SPEECH_MODEL_URL,
      destination: files.modelPath,
      signal,
      onProgress: (received, total) => onPercent(downloadPercent(30, 90, received, total)),
    });
  }
  if (!fileReady(files.vadPath)) {
    await downloadFile({
      url: SPEECH_VAD_URL,
      destination: files.vadPath,
      signal,
      onProgress: (received, total) => onPercent(downloadPercent(90, 99, received, total)),
    });
  }
}

async function writeStubSpeechFiles(files: SpeechModelFiles): Promise<void> {
  await fs.promises.mkdir(path.dirname(files.binaryPath), { recursive: true });
  await fs.promises.mkdir(path.dirname(files.modelPath), { recursive: true });
  await fs.promises.mkdir(path.dirname(files.vadPath), { recursive: true });
  await fs.promises.writeFile(files.binaryPath, "stub-whisper");
  await fs.promises.writeFile(files.modelPath, "stub-model");
  await fs.promises.writeFile(files.vadPath, "stub-vad");
}

function fileReady(filePath: string): boolean {
  try {
    return fs.statSync(filePath).size > 0;
  } catch {
    return false;
  }
}
