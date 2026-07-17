import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { nativeImage } from "electron";
import {
  clockwiseDegreesFromExifOrientation,
  ffmpegTransposeFilterForExifOrientation,
} from "./jpeg-exif-orientation";
import { readEmbeddedJpegThumbnailSync } from "./tv-broadcast-embedded-thumb";
import { createOrientedJpegWithFfmpeg, runFfmpegScaleTranspose } from "./tv-broadcast-ffmpeg-jpeg";

/**
 * Fallback when ffmpeg is unavailable. Only safe for orientation 1 —
 * Electron 38 nativeImage has no rotate().
 */
export function createOrientedJpegNativeResizeOnly(
  filePath: string,
  maxEdge: number,
  quality = 78,
): Buffer | null {
  let image = nativeImage.createFromPath(filePath);
  if (image.isEmpty()) return null;
  const { width, height } = image.getSize();
  if (width <= 0 || height <= 0) return null;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  if (scale < 1) {
    image = image.resize({
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
      quality: "better",
    });
  }
  return Buffer.from(image.toJPEG(quality));
}

/** Rail fast path: EXIF embedded thumb + ffmpeg transpose when needed. */
export async function createOrientedJpegFromEmbeddedThumb(
  filePath: string,
  maxEdge: number,
  quality: number,
  orientation: number,
): Promise<Buffer | null> {
  const embedded = readEmbeddedJpegThumbnailSync(filePath);
  if (!embedded) return null;

  const degrees = clockwiseDegreesFromExifOrientation(orientation);
  if (degrees === 0) {
    let image = nativeImage.createFromBuffer(embedded);
    if (image.isEmpty()) return embedded;
    const { width, height } = image.getSize();
    if (width <= 0 || height <= 0) return embedded;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    if (scale < 1) {
      image = image.resize({
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
        quality: "better",
      });
      return Buffer.from(image.toJPEG(quality));
    }
    return embedded;
  }

  const tmpIn = path.join(
    os.tmpdir(),
    "emk-tv-broadcast-thumbs",
    `emb_in_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`,
  );
  const tmpOut = `${tmpIn}.out.jpg`;
  try {
    await fsPromises.mkdir(path.dirname(tmpIn), { recursive: true });
    await fsPromises.writeFile(tmpIn, embedded);
    const transpose = ffmpegTransposeFilterForExifOrientation(orientation);
    const scale = `scale='min(${maxEdge},iw)':-1`;
    const vf = transpose ? `${scale},${transpose}` : scale;
    await runFfmpegScaleTranspose(tmpIn, tmpOut, vf, quality);
    return await fsPromises.readFile(tmpOut);
  } catch {
    return null;
  } finally {
    await fsPromises.unlink(tmpIn).catch(() => undefined);
    await fsPromises.unlink(tmpOut).catch(() => undefined);
    await fsPromises.unlink(`${tmpOut}.partial.jpg`).catch(() => undefined);
  }
}

/** 1) embedded EXIF thumb (rail)  2) ffmpeg  3) native resize if upright */
export async function createOrientedJpeg(
  filePath: string,
  maxEdge: number,
  quality: number,
  orientation: number,
  preferEmbeddedThumb: boolean,
): Promise<Buffer | null> {
  if (preferEmbeddedThumb) {
    const fromEmbedded = await createOrientedJpegFromEmbeddedThumb(
      filePath,
      maxEdge,
      quality,
      orientation,
    );
    if (fromEmbedded) return fromEmbedded;
  }

  const fromFfmpeg = await createOrientedJpegWithFfmpeg(filePath, maxEdge, quality, orientation);
  if (fromFfmpeg) return fromFfmpeg;

  if (clockwiseDegreesFromExifOrientation(orientation) === 0) {
    return createOrientedJpegNativeResizeOnly(filePath, maxEdge, quality);
  }
  return null;
}
