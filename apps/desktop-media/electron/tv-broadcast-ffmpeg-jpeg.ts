import { spawn } from "node:child_process";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ffmpegTransposeFilterForExifOrientation } from "./jpeg-exif-orientation";
import { resolveFfmpegPath } from "./tv-broadcast-video-proxy";

function jpegQualityToFfmpegQ(quality: number): number {
  return Math.max(2, Math.min(12, Math.round((100 - quality) / 8) + 2));
}

export function buildScaleTransposeVf(maxEdge: number, orientation: number): string {
  const transpose = ffmpegTransposeFilterForExifOrientation(orientation);
  const scale = `scale='min(${maxEdge},iw)':-1`;
  return transpose ? `${scale},${transpose}` : scale;
}

export async function runFfmpegScaleTranspose(
  inputPath: string,
  outputPath: string,
  vf: string,
  quality: number,
): Promise<void> {
  const ffmpeg = resolveFfmpegPath();
  if (!ffmpeg) {
    throw new Error("ffmpeg not available");
  }
  await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });
  const tmpPath = `${outputPath}.partial.jpg`;
  const args = [
    "-y",
    "-noautorotate",
    "-i",
    inputPath,
    "-vf",
    vf,
    "-frames:v",
    "1",
    "-q:v",
    String(jpegQualityToFfmpegQ(quality)),
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
      else reject(new Error(stderr.trim().slice(-400) || `ffmpeg jpeg exit ${code}`));
    });
    child.on("error", reject);
  });
  await fsPromises.rename(tmpPath, outputPath);
}

/** Fast upright JPEG via ffmpeg (scale then transpose). ~150ms for 24MP files. */
export async function createOrientedJpegWithFfmpeg(
  filePath: string,
  maxEdge: number,
  quality: number,
  orientation: number,
): Promise<Buffer | null> {
  if (!resolveFfmpegPath()) return null;
  const tmpOut = path.join(
    os.tmpdir(),
    "emk-tv-broadcast-thumbs",
    `bake_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`,
  );
  try {
    await runFfmpegScaleTranspose(
      filePath,
      tmpOut,
      buildScaleTransposeVf(maxEdge, orientation),
      quality,
    );
    return await fsPromises.readFile(tmpOut);
  } catch (error) {
    console.warn(
      `[tv-broadcast] ffmpeg jpeg bake failed for ${path.basename(filePath)}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  } finally {
    await fsPromises.unlink(tmpOut).catch(() => undefined);
    await fsPromises.unlink(`${tmpOut}.partial.jpg`).catch(() => undefined);
  }
}
