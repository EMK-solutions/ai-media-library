import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DEFAULT_LIBRARY_ID } from "./db/folder-analysis-status";
import { getDesktopDatabase } from "./db/client";
import { readJpegExifOrientationSync } from "./jpeg-exif-orientation";
import { createOrientedJpeg } from "./tv-broadcast-oriented-jpeg";

const THUMB_MAX_EDGE = 640;
/** TV stage preview — enough for 1080p/4K panels without shipping multi‑MB originals. */
const STAGE_MAX_EDGE = 1920;
/** Bump when bake/orientation algorithm changes. */
const CACHE_VERSION = "v8";
const memoryCache = new Map<string, Buffer>();
const inFlight = new Map<string, Promise<Buffer | null>>();

const MAX_CONCURRENT_BAKES = 2;
let activeBakes = 0;
const bakeWaiters: Array<() => void> = [];

export function tvBroadcastThumbCacheDir(): string {
  return path.join(os.tmpdir(), "emk-tv-broadcast-thumbs");
}

function cachePathFor(sourcePath: string, kind: "thumb" | "stage"): string {
  const safe = Buffer.from(sourcePath).toString("base64url").slice(0, 80);
  return path.join(tvBroadcastThumbCacheDir(), `${safe}_${kind}_${CACHE_VERSION}.jpg`);
}

async function withBakeSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (activeBakes >= MAX_CONCURRENT_BAKES) {
    await new Promise<void>((resolve) => {
      bakeWaiters.push(resolve);
    });
  }
  activeBakes += 1;
  try {
    return await fn();
  } finally {
    activeBakes -= 1;
    bakeWaiters.shift()?.();
  }
}

/**
 * Prefer catalog orientation; when missing/null, read EXIF Orientation from the
 * JPEG header only (≤256KB) — never decode the full image for this lookup.
 */
export function resolveImageOrientationFromDb(filePath: string): number {
  try {
    const db = getDesktopDatabase();
    const normalized = path.normalize(filePath);
    const slashVariant = normalized.includes("\\")
      ? normalized.replace(/\\/g, "/")
      : normalized.replace(/\//g, "\\");
    const row = db
      .prepare(
        `SELECT orientation
         FROM media_items
         WHERE library_id = ?
           AND deleted_at IS NULL
           AND (source_path = ? OR source_path = ? OR lower(source_path) = lower(?))
         LIMIT 1`,
      )
      .get(DEFAULT_LIBRARY_ID, normalized, slashVariant, normalized) as
      | { orientation: number | null }
      | undefined;
    if (row && typeof row.orientation === "number" && row.orientation >= 1 && row.orientation <= 8) {
      return row.orientation;
    }
  } catch {
    // DB unavailable (unit tests) — fall through to header EXIF / default.
  }

  const fromFile = readJpegExifOrientationSync(filePath);
  if (fromFile !== null && fromFile >= 1 && fromFile <= 8) {
    return fromFile;
  }
  return 1;
}

/** @deprecated Use resolveImageOrientationFromDb — kept for existing tests. */
export function resolveImageOrientationForThumb(filePath: string): number | null {
  return resolveImageOrientationFromDb(filePath);
}

async function getOrCreateCachedJpeg(
  filePath: string,
  kind: "thumb" | "stage",
  maxEdge: number,
  quality: number,
): Promise<Buffer | null> {
  const memKey = `${kind}:${filePath}`;
  const mem = memoryCache.get(memKey);
  if (mem) return mem;

  const existing = inFlight.get(memKey);
  if (existing) return existing;

  const promise = withBakeSlot(async (): Promise<Buffer | null> => {
    const diskPath = cachePathFor(filePath, kind);
    try {
      const sourceStat = await fsPromises.stat(filePath);
      const cacheStat = await fsPromises.stat(diskPath).catch(() => null);
      if (cacheStat && cacheStat.mtimeMs >= sourceStat.mtimeMs && cacheStat.size > 0) {
        const buffered = await fsPromises.readFile(diskPath);
        memoryCache.set(memKey, buffered);
        return buffered;
      }
    } catch {
      // continue
    }

    const orientation = resolveImageOrientationFromDb(filePath);
    // Never use EXIF IFD1 thumbs for the rail — they are ~160px and look soft on TV.
    const created = await createOrientedJpeg(
      filePath,
      maxEdge,
      quality,
      orientation,
      false,
    );
    if (!created) return null;
    memoryCache.set(memKey, created);
    try {
      await fsPromises.mkdir(path.dirname(diskPath), { recursive: true });
      await fsPromises.writeFile(diskPath, created);
    } catch {
      // memory cache still helps
    }
    return created;
  }).finally(() => {
    inFlight.delete(memKey);
  });

  inFlight.set(memKey, promise);
  return promise;
}

export function getOrCreateImageThumbJpeg(filePath: string): Promise<Buffer | null> {
  return getOrCreateCachedJpeg(filePath, "thumb", THUMB_MAX_EDGE, 82);
}

export function getOrCreateImageStageJpeg(filePath: string): Promise<Buffer | null> {
  return getOrCreateCachedJpeg(filePath, "stage", STAGE_MAX_EDGE, 82);
}

/** Test helper: clear in-memory thumb cache. */
export function clearTvBroadcastThumbMemoryCache(): void {
  memoryCache.clear();
  inFlight.clear();
}
