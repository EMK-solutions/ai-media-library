import { spawn } from "node:child_process";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { QuarterTurnDegrees } from "./mp4-video-orientation";

let cachedFfmpegPath: string | null | undefined;

const inFlightBakes = new Map<string, Promise<string>>();

/** Bump when bake args change so stale double-rotated proxies are not reused. */
const PROXY_CACHE_VERSION = "v3";

/**
 * Resolve an ffmpeg binary: FFMPEG_PATH, then @ffmpeg-installer/ffmpeg.
 */
export function resolveFfmpegPath(): string | null {
  if (cachedFfmpegPath !== undefined) {
    return cachedFfmpegPath;
  }
  const fromEnv = process.env.FFMPEG_PATH?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) {
    cachedFfmpegPath = fromEnv;
    return cachedFfmpegPath;
  }
  try {
    // Kept external in vite.main.config — resolved at runtime from node_modules.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const installer = require("@ffmpeg-installer/ffmpeg") as { path?: string };
    if (installer.path && fs.existsSync(installer.path)) {
      cachedFfmpegPath = installer.path;
      return cachedFfmpegPath;
    }
  } catch {
    // ignore
  }
  cachedFfmpegPath = null;
  return null;
}

export function tvBroadcastProxyCacheDir(): string {
  return path.join(os.tmpdir(), "emk-tv-broadcast-video-proxy");
}

export function proxyOutputPathForSource(sourcePath: string): string {
  const safe = Buffer.from(sourcePath).toString("base64url").slice(0, 80);
  return path.join(tvBroadcastProxyCacheDir(), `${safe}_upright_${PROXY_CACHE_VERSION}.mp4`);
}

/**
 * Re-encode so pixels are upright and rotation metadata is cleared.
 *
 * Important: ffmpeg applies the MP4 display matrix on decode by default.
 * Do NOT also run a transpose filter — that double-rotates (TV looked
 * sideways again after our first bake attempt).
 */
async function runFfmpegBake(sourcePath: string, outputPath: string): Promise<string> {
  const ffmpeg = resolveFfmpegPath();
  if (!ffmpeg) {
    throw new Error("ffmpeg not available");
  }

  await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });
  const sourceStat = await fsPromises.stat(sourcePath);
  const outStat = await fsPromises.stat(outputPath).catch(() => null);
  if (outStat && outStat.mtimeMs >= sourceStat.mtimeMs && outStat.size > 0) {
    return outputPath;
  }

  const tmpPath = `${outputPath}.partial.mp4`;
  const args = [
    "-y",
    "-i",
    sourcePath,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    "-metadata:s:v:0",
    "rotate=0",
    tmpPath,
  ];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpeg, args, { windowsHide: true });
    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim().slice(-500) || `ffmpeg exited with code ${code}`));
    });
    child.on("error", (error) => reject(error));
  });

  await fsPromises.rename(tmpPath, outputPath);
  return outputPath;
}

/**
 * Ensure an upright MP4 exists for Smart TV playback (CSS transforms on video are ignored
 * on many Tizen/WebOS engines because of the hardware video overlay).
 */
export async function ensureUprightVideoFile(
  sourcePath: string,
  degrees: QuarterTurnDegrees,
): Promise<string> {
  if (degrees === 0) {
    return sourcePath;
  }
  if (!resolveFfmpegPath()) {
    return sourcePath;
  }
  const outputPath = proxyOutputPathForSource(sourcePath);
  const existing = inFlightBakes.get(outputPath);
  if (existing) {
    return existing;
  }
  const promise = runFfmpegBake(sourcePath, outputPath)
    .catch(async (error) => {
      console.warn(
        `[tv-broadcast] video rotation bake failed for ${path.basename(sourcePath)}:`,
        error instanceof Error ? error.message : error,
      );
      await fsPromises.unlink(`${outputPath}.partial.mp4`).catch(() => undefined);
      return sourcePath;
    })
    .finally(() => {
      inFlightBakes.delete(outputPath);
    });
  inFlightBakes.set(outputPath, promise);
  return promise;
}

/** Fire-and-forget bake used when a broadcast starts. */
export function prefetchUprightVideoFile(sourcePath: string, degrees: QuarterTurnDegrees): void {
  if (degrees === 0) return;
  void ensureUprightVideoFile(sourcePath, degrees);
}
