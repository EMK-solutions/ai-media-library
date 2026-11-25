import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { SpeechModelFiles } from "./speech-model-paths";

/** Runs whisper-cli and returns the parsed `-ojf` JSON document. */
export function runWhisperCli(options: {
  files: SpeechModelFiles;
  wavPath: string;
  outputBase: string;
  wordTimestamps: boolean;
  silenceMinMs: number;
  language: string;
  signal?: AbortSignal;
}): Promise<unknown> {
  const args = [
    "-m",
    options.files.modelPath,
    "-f",
    options.wavPath,
    "-l",
    options.language,
    "-ojf",
    "-of",
    options.outputBase,
    "--vad",
    "-vm",
    options.files.vadPath,
    "-vsd",
    String(Math.max(0, Math.round(options.silenceMinMs))),
    "--no-prints",
  ];
  if (options.wordTimestamps) {
    args.push("-sow");
  }
  const binaryDir = path.dirname(options.files.binaryPath);
  console.log("[speech] whisper-cli", options.files.binaryPath, "language", options.language, "cwd", binaryDir);
  return new Promise((resolve, reject) => {
    const child = spawn(options.files.binaryPath, args, {
      windowsHide: true,
      cwd: binaryDir,
      signal: options.signal,
    });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (options.signal?.aborted) {
        reject(new Error("Speech transcription cancelled"));
        return;
      }
      console.error("[speech] whisper-cli failed to start", error);
      reject(error);
    });
    child.on("close", (code) => {
      if (options.signal?.aborted) {
        reject(new Error("Speech transcription cancelled"));
        return;
      }
      const jsonPath = `${options.outputBase}.json`;
      if (code === 0 && !fs.existsSync(jsonPath)) {
        console.warn("[speech] whisper-cli wrote no JSON; treating as no speech", stderr.trim().slice(-300));
        resolve({ transcription: [] });
        return;
      }
      if (code !== 0 || !fs.existsSync(jsonPath)) {
        const detail = stderr.trim().slice(-500);
        console.error("[speech] whisper-cli exit", code, detail || "(no stderr)");
        reject(new Error(detail || whisperExitMessage(code)));
        return;
      }
      try {
        resolve(JSON.parse(fs.readFileSync(jsonPath, "utf8")) as unknown);
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Could not parse whisper.cpp JSON"));
      } finally {
        fs.rmSync(jsonPath, { force: true });
      }
    });
  });
}

function whisperExitMessage(code: number | null): string {
  if (code === 3221225781) {
    return "whisper-cli could not start because a DLL next to the executable is missing. In Settings, open Video speech to text and choose Download again.";
  }
  return `whisper-cli exit ${code}`;
}

export function speechWorkDir(rootDir: string, jobId: string): string {
  return path.join(rootDir, "work", jobId);
}
