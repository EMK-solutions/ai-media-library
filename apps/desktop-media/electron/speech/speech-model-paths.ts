import fs from "node:fs";
import path from "node:path";

export const SPEECH_MODEL_FILENAME = "ggml-large-v3-turbo-q5_0.bin";
export const SPEECH_VAD_FILENAME = "ggml-silero-v6.2.0.bin";
export const SPEECH_BINARY_RELEASE = "b5907";

export interface SpeechModelFiles {
  rootDir: string;
  binaryPath: string;
  modelPath: string;
  vadPath: string;
}

export function speechModelFilesIn(modelsRoot: string): SpeechModelFiles {
  const rootDir = path.join(modelsRoot, "speech");
  const binaryName = process.platform === "win32" ? "whisper-cli.exe" : "whisper-cli";
  const binaryOverride = process.env.WHISPER_CPP_PATH?.trim();
  const modelOverride = process.env.WHISPER_MODEL_PATH?.trim();
  return {
    rootDir,
    binaryPath: binaryOverride && binaryOverride.length > 0 ? binaryOverride : path.join(rootDir, binaryName),
    modelPath: modelOverride && modelOverride.length > 0 ? modelOverride : path.join(rootDir, SPEECH_MODEL_FILENAME),
    vadPath: path.join(rootDir, SPEECH_VAD_FILENAME),
  };
}

export function speechModelFilesReady(files: SpeechModelFiles): boolean {
  return [files.binaryPath, files.modelPath, files.vadPath].every((filePath) => fileExists(filePath));
}

export function binaryArchiveForPlatform(): { url: string } {
  const base = `https://github.com/ggml-org/whisper.cpp/releases/download/${SPEECH_BINARY_RELEASE}`;
  if (process.platform === "win32" && process.arch === "arm64") {
    return { url: `${base}/whisper-bin-win-cpu-arm64.zip` };
  }
  if (process.platform === "win32") {
    return { url: `${base}/whisper-bin-x64.zip` };
  }
  if (process.platform === "linux" && process.arch === "arm64") {
    return { url: `${base}/whisper-bin-ubuntu-arm64.tar.gz` };
  }
  return { url: `${base}/whisper-bin-ubuntu-x64.tar.gz` };
}

export const SPEECH_MODEL_URL =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin";

export const SPEECH_VAD_URL =
  "https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v6.2.0.bin";

function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).size > 0;
  } catch {
    return false;
  }
}
