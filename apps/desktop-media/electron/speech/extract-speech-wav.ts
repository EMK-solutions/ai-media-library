import { spawn } from "node:child_process";
import fs from "node:fs";
import { resolveFfmpegPath } from "../tv-broadcast-video-proxy";

export type SpeechWavResult = { hasAudio: true } | { hasAudio: false };

const NO_AUDIO_PATTERNS = [
  /does not contain any stream/i,
  /Output file #0 does not contain any stream/i,
  /matches no streams/i,
];

/** True when ffmpeg stderr says the input has no audio stream to extract. */
export function isNoAudioStreamError(stderr: string): boolean {
  return NO_AUDIO_PATTERNS.some((pattern) => pattern.test(stderr));
}

/** Extracts 16 kHz mono PCM WAV audio for whisper.cpp. Resolves `hasAudio: false` for silent containers. */
export function extractSpeechWav(videoPath: string, wavPath: string, signal?: AbortSignal): Promise<SpeechWavResult> {
  const ffmpeg = resolveFfmpegPath();
  if (!ffmpeg) {
    return Promise.reject(new Error("ffmpeg is not available. Install ffmpeg or set FFMPEG_PATH."));
  }
  return new Promise((resolve, reject) => {
    const child = spawn(
      ffmpeg,
      ["-y", "-i", videoPath, "-vn", "-map", "0:a:0?", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wavPath],
      { windowsHide: true, signal },
    );
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (signal?.aborted) {
        reject(new Error("Speech transcription cancelled"));
        return;
      }
      if (code === 0) {
        resolve({ hasAudio: true });
        return;
      }
      if (isNoAudioStreamError(stderr)) {
        console.log("[speech] no audio stream", videoPath);
        resolve({ hasAudio: false });
        return;
      }
      const detail = stderr.trim().slice(-400) || `ffmpeg audio extract exit ${code}`;
      console.error("[speech] ffmpeg failed", videoPath, detail);
      reject(new Error(detail));
    });
  });
}

/** Duration of a 16-bit PCM WAV, in milliseconds. */
export function wavDurationMs(wavPath: string): number {
  const header = Buffer.alloc(44);
  const fd = fs.openSync(wavPath, "r");
  try {
    fs.readSync(fd, header, 0, 44, 0);
  } finally {
    fs.closeSync(fd);
  }
  const sampleRate = header.readUInt32LE(24);
  const channels = header.readUInt16LE(22);
  const bits = header.readUInt16LE(34);
  const dataBytes = Math.max(0, fs.statSync(wavPath).size - 44);
  const bytesPerSecond = sampleRate * channels * (bits / 8);
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return 0;
  return Math.round((dataBytes / bytesPerSecond) * 1000);
}
