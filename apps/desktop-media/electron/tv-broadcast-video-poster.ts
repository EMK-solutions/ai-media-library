import { spawn } from "node:child_process";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { nativeImage } from "electron";
import { resolveFfmpegPath } from "./tv-broadcast-video-proxy";

const POSTER_MAX_EDGE = 320;
const POSTER_CACHE_VERSION = "v4";
const memoryCache = new Map<string, Buffer>();
const inFlight = new Map<string, Promise<Buffer | null>>();

export function tvBroadcastPosterCacheDir(): string {
  return path.join(os.tmpdir(), "emk-tv-broadcast-posters");
}

function posterCachePath(sourcePath: string): string {
  const safe = Buffer.from(sourcePath).toString("base64url").slice(0, 80);
  return path.join(tvBroadcastPosterCacheDir(), `${safe}_${POSTER_CACHE_VERSION}.jpg`);
}

async function extractPosterWithFfmpeg(sourcePath: string, outputPath: string): Promise<void> {
  const ffmpeg = resolveFfmpegPath();
  if (!ffmpeg) {
    throw new Error("ffmpeg not available");
  }
  await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });
  const tmpPath = `${outputPath}.partial.jpg`;
  // Seek after -i for accuracy; grab one frame. ffmpeg autorotates display matrix on decode.
  const args = [
    "-y",
    "-i",
    sourcePath,
    "-ss",
    "0.25",
    "-frames:v",
    "1",
    "-q:v",
    "3",
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
      else reject(new Error(stderr.trim().slice(-400) || `ffmpeg poster exit ${code}`));
    });
    child.on("error", reject);
  });
  await fsPromises.rename(tmpPath, outputPath);
}

function resizePosterJpeg(filePath: string): Buffer | null {
  let image = nativeImage.createFromPath(filePath);
  if (image.isEmpty()) return null;
  const { width, height } = image.getSize();
  if (width <= 0 || height <= 0) return null;
  const scale = Math.min(1, POSTER_MAX_EDGE / Math.max(width, height));
  if (scale < 1) {
    image = image.resize({
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
      quality: "better",
    });
  }
  return Buffer.from(image.toJPEG(72));
}

/**
 * First-frame JPEG for TV rail (desktop uses &lt;video preload=metadata&gt;; TV rail is &lt;img&gt;).
 */
export async function getOrCreateVideoPosterJpeg(sourcePath: string): Promise<Buffer | null> {
  const mem = memoryCache.get(sourcePath);
  if (mem) return mem;

  const existing = inFlight.get(sourcePath);
  if (existing) return existing;

  const promise = (async (): Promise<Buffer | null> => {
    const cachePath = posterCachePath(sourcePath);
    try {
      const sourceStat = await fsPromises.stat(sourcePath);
      const cacheStat = await fsPromises.stat(cachePath).catch(() => null);
      if (cacheStat && cacheStat.mtimeMs >= sourceStat.mtimeMs && cacheStat.size > 0) {
        const buffered = await fsPromises.readFile(cachePath);
        memoryCache.set(sourcePath, buffered);
        return buffered;
      }
    } catch {
      // continue
    }

    if (!resolveFfmpegPath()) {
      return null;
    }

    try {
      await extractPosterWithFfmpeg(sourcePath, cachePath);
      const resized = resizePosterJpeg(cachePath);
      if (!resized) {
        const raw = await fsPromises.readFile(cachePath);
        memoryCache.set(sourcePath, raw);
        return raw;
      }
      await fsPromises.writeFile(cachePath, resized);
      memoryCache.set(sourcePath, resized);
      return resized;
    } catch (error) {
      console.warn(
        `[tv-broadcast] video poster failed for ${path.basename(sourcePath)}:`,
        error instanceof Error ? error.message : error,
      );
      await fsPromises.unlink(`${cachePath}.partial.jpg`).catch(() => undefined);
      return null;
    }
  })().finally(() => {
    inFlight.delete(sourcePath);
  });

  inFlight.set(sourcePath, promise);
  return promise;
}

export function clearTvBroadcastPosterMemoryCache(): void {
  memoryCache.clear();
}
