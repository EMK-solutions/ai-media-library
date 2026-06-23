import { mergeMetadataV2, normalizeMetadata } from "@emk/media-metadata-core";
import { getDesktopDatabase } from "./client";
import { DEFAULT_LIBRARY_ID } from "./folder-analysis-status";
import { syncFtsForMediaItem } from "./keyword-search";
import type { DesktopMediaItemMetadata } from "../../src/shared/ipc";
import { getMediaItemMetadataByPaths, upsertMediaItemFromFilePath } from "./media-item-metadata";
import { lookupActiveMediaItemBySourcePath } from "./media-item-path-lookup";

function parseAiMetadataJson(raw: string | null): unknown {
  if (!raw?.trim()) {
    return null;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/**
 * Updates `media_items.star_rating`, merges `embedded.star_rating` in `ai_metadata`, refreshes FTS.
 * Does not touch files on disk.
 */
export async function updateMediaItemStarRatingInDb(params: {
  sourcePath: string;
  starRating: number;
  libraryId?: string;
}): Promise<{ ok: true; metadata: DesktopMediaItemMetadata } | { ok: false; error: string }> {
  const libraryId = params.libraryId ?? DEFAULT_LIBRARY_ID;
  const starRating = params.starRating;
  if (!Number.isFinite(starRating) || starRating < 0 || starRating > 5 || !Number.isInteger(starRating)) {
    return { ok: false, error: "starRating must be an integer from 0 to 5." };
  }

  const trimmedPath = params.sourcePath.trim();
  if (!trimmedPath) {
    return { ok: false, error: "sourcePath is required." };
  }

  const db = getDesktopDatabase();
  let row = lookupActiveMediaItemBySourcePath(libraryId, trimmedPath, db);

  if (!row) {
    const upsert = await upsertMediaItemFromFilePath({ filePath: trimmedPath, libraryId });
    if (upsert.status === "failed") {
      return {
        ok: false,
        error: upsert.error ?? "Media item not found for path.",
      };
    }
    row = lookupActiveMediaItemBySourcePath(libraryId, trimmedPath, db);
  }

  if (!row) {
    return { ok: false, error: "Media item not found for path." };
  }

  const canonicalPath = row.sourcePath;
  const priorAi = parseAiMetadataJson(row.ai_metadata);
  const merged = normalizeMetadata(
    mergeMetadataV2(priorAi, {
      file_data: {
        exif_xmp: {
          star_rating: starRating,
        },
      },
    }),
  );
  const nextAi = JSON.stringify(merged);
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE media_items SET star_rating = ?, ai_metadata = ?, updated_at = ? WHERE id = ? AND library_id = ?`,
  ).run(starRating, nextAi, now, row.id, libraryId);

  try {
    syncFtsForMediaItem(row.id, libraryId);
  } catch {
    // best-effort
  }

  const byPath = getMediaItemMetadataByPaths([canonicalPath], libraryId);
  const metadata = byPath[canonicalPath];
  if (!metadata) {
    return { ok: false, error: "Failed to load metadata after update." };
  }
  return { ok: true, metadata };
}
