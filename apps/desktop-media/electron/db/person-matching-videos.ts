import path from "node:path";
import { VIDEO_EXTENSIONS } from "../../src/shared/ipc";
import { getDesktopDatabase } from "./client";
import { DEFAULT_LIBRARY_ID } from "./folder-analysis-status";
import { appendEventAndLocationPredicates } from "./media-item-sql-filters";
import type { SemanticFilters, SemanticSearchRow } from "./semantic-search";

function buildVideoFilePredicate(): string {
  const extClauses = [...VIDEO_EXTENSIONS].map((ext) => {
    const pat = `%${ext}`.replace(/'/g, "''");
    return `lower(mi.filename) LIKE '${pat}'`;
  });
  return `(mi.media_kind = 'video' OR mi.mime_type LIKE 'video/%' OR ${extClauses.join(" OR ")})`;
}

function appendPersonTagPredicates(
  where: string[],
  args: unknown[],
  libraryId: string,
  filters: SemanticFilters,
): void {
  if (!filters.personTagIds || filters.personTagIds.length === 0) {
    return;
  }
  const allowUnconfirmed = filters.includeUnconfirmedFaces === true;
  for (const tagId of filters.personTagIds) {
    if (allowUnconfirmed) {
      where.push(
        `(
          EXISTS (
            SELECT 1 FROM media_face_instances fi
            WHERE fi.media_item_id = mi.id
              AND fi.library_id = ?
              AND fi.tag_id = ?
          )
          OR EXISTS (
            SELECT 1 FROM media_item_person_suggestions ps
            WHERE ps.media_item_id = mi.id
              AND ps.library_id = ?
              AND ps.tag_id = ?
          )
        )`,
      );
      args.push(libraryId, tagId, libraryId, tagId);
    } else {
      where.push(
        `EXISTS (
          SELECT 1 FROM media_face_instances fi
          WHERE fi.media_item_id = mi.id
            AND fi.library_id = ?
            AND fi.tag_id = ?
        )`,
      );
      args.push(libraryId, tagId);
    }
  }
}

/**
 * Videos that match the person-chip filter (AND across people, same unconfirmed
 * rule as photo search). They are not in the vision index, so they are appended
 * after ranked image hits.
 */
export function listVideosMatchingPersonTags(
  filters: SemanticFilters,
  libraryId = DEFAULT_LIBRARY_ID,
): SemanticSearchRow[] {
  if (!filters.personTagIds || filters.personTagIds.length === 0) {
    return [];
  }

  const db = getDesktopDatabase();
  const where: string[] = [
    "mi.library_id = ?",
    "mi.deleted_at IS NULL",
    buildVideoFilePredicate(),
  ];
  const args: unknown[] = [libraryId];

  appendEventAndLocationPredicates(where, args, "mi", filters);

  if (filters.folderPath) {
    const sep = path.sep;
    const folderPrefix = filters.folderPath.endsWith(sep)
      ? filters.folderPath
      : filters.folderPath + sep;
    where.push("mi.source_path LIKE ? ESCAPE '~'");
    args.push(folderPrefix.replace(/[%_~]/g, "~$&") + "%");
  }

  appendPersonTagPredicates(where, args, libraryId, filters);

  const tagPlaceholders = filters.personTagIds.map(() => "?").join(", ");
  const scoreArgs = [...filters.personTagIds];

  const rows = db
    .prepare(
      `SELECT
         mi.id as media_item_id,
         mi.source_path,
         mi.filename,
         mi.city,
         mi.country,
         mi.people_detected,
         mi.age_min,
         mi.age_max,
         COALESCE((
           SELECT MAX(ps.best_similarity)
           FROM media_item_person_suggestions ps
           WHERE ps.media_item_id = mi.id
             AND ps.library_id = mi.library_id
             AND ps.tag_id IN (${tagPlaceholders})
         ), 0) AS suggestion_score
       FROM media_items mi
       WHERE ${where.join(" AND ")}`,
    )
    .all(...args, ...scoreArgs) as Array<{
    media_item_id: string;
    source_path: string;
    filename: string;
    city: string | null;
    country: string | null;
    people_detected: number | null;
    age_min: number | null;
    age_max: number | null;
    suggestion_score: number | null;
  }>;

  const filteredRows =
    filters.folderPath && !filters.recursive
      ? rows.filter((row) => path.dirname(row.source_path) === filters.folderPath)
      : rows;

  return filteredRows
    .map((row) => ({
      mediaItemId: row.media_item_id,
      path: row.source_path,
      name: row.filename,
      score: Number(row.suggestion_score ?? 0),
      city: row.city,
      country: row.country,
      peopleDetected: row.people_detected,
      ageMin: row.age_min,
      ageMax: row.age_max,
    }))
    .sort((a, b) => b.score - a.score);
}

/** Append person-matching videos after ranked image hits, skipping duplicates. */
export function mergePersonMatchingVideosIntoSearchResults(
  imageRows: SemanticSearchRow[],
  videoRows: SemanticSearchRow[],
): SemanticSearchRow[] {
  const seen = new Set(imageRows.map((row) => row.mediaItemId));
  const extra = videoRows.filter((row) => !seen.has(row.mediaItemId));
  return [...imageRows, ...extra];
}
