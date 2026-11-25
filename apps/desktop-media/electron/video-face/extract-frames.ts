import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveFfmpegPath } from "../tv-broadcast-video-proxy";
import { planVideoFaceSamples } from "./sample-timestamps";

export interface ExtractedVideoFrame {
  filePath: string;
  frameIndex: number;
  timeMs: number;
}

export interface ExtractVideoFramesResult {
  frames: ExtractedVideoFrame[];
  tempDir: string;
  durationSec: number;
}

function parseDurationSec(stderr: string): number | null {
  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (![hours, minutes, seconds].every((n) => Number.isFinite(n))) {
    return null;
  }
  return hours * 3600 + minutes * 60 + seconds;
}

async function runFfmpeg(args: string[], signal?: AbortSignal): Promise<{ code: number; stderr: string }> {
  const ffmpeg = resolveFfmpegPath();
  if (!ffmpeg) {
    throw new Error("ffmpeg is not available. Install ffmpeg or set FFMPEG_PATH to detect faces in videos.");
  }
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, { windowsHide: true });
    let stderr = "";
    const onAbort = (): void => {
      child.kill();
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      signal?.removeEventListener("abort", onAbort);
      reject(error);
    });
    child.on("close", (code) => {
      signal?.removeEventListener("abort", onAbort);
      resolve({ code: code ?? 1, stderr });
    });
  });
}

export async function probeVideoDurationSec(
  sourcePath: string,
  signal?: AbortSignal,
): Promise<number | null> {
  const result = await runFfmpeg(["-i", sourcePath, "-f", "null", "-"], signal);
  return parseDurationSec(result.stderr);
}

export async function extractVideoFaceFrames(params: {
  sourcePath: string;
  intervalSec: number;
  durationSec?: number | null;
  signal?: AbortSignal;
}): Promise<ExtractVideoFramesResult> {
  if (params.signal?.aborted) {
    throw new Error("Face detection cancelled");
  }
  let durationSec = params.durationSec ?? null;
  if (durationSec == null || !Number.isFinite(durationSec) || durationSec <= 0) {
    durationSec = await probeVideoDurationSec(params.sourcePath, params.signal);
  }
  if (durationSec == null || durationSec <= 0) {
    throw new Error("Could not determine video duration.");
  }

  const plan = planVideoFaceSamples({
    durationSec,
    intervalSec: params.intervalSec,
  });
  if (plan.timestampsSec.length === 0) {
    throw new Error("Video is too short to sample for face detection.");
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "emk-video-faces-"));
  const pattern = path.join(tempDir, "frame_%06d.jpg");
  const fps = Math.max(0.05, plan.fps);
  const result = await runFfmpeg(
    [
      "-y",
      "-i",
      params.sourcePath,
      "-vf",
      `fps=${fps}`,
      "-q:v",
      "3",
      "-frames:v",
      String(plan.timestampsSec.length),
      pattern,
    ],
    params.signal,
  );
  if (result.code !== 0) {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    throw new Error(result.stderr.trim().slice(-400) || `ffmpeg frame extract exit ${result.code}`);
  }

  const names = (await fs.readdir(tempDir))
    .filter((name) => name.toLowerCase().endsWith(".jpg"))
    .sort();
  const frames: ExtractedVideoFrame[] = names.map((name, index) => ({
    filePath: path.join(tempDir, name),
    frameIndex: index,
    timeMs: Math.round((plan.timestampsSec[index] ?? index / fps) * 1000),
  }));

  return { frames, tempDir, durationSec };
}

export async function removeExtractedVideoFrames(tempDir: string): Promise<void> {
  await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
}
