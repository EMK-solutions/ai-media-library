import { mergeMetadataV2, type SpeechAnalysisMetadata } from "@emk/media-metadata-core";
import { getDesktopDatabase } from "./client";
import { DEFAULT_LIBRARY_ID } from "./folder-analysis-status";
import { syncFtsForMediaItem } from "./keyword-search";

const MAX_ERROR_LENGTH = 500;
const IN_CHUNK_SIZE = 400;

export function upsertSpeechAnalysisResult(
  videoPath: string,
  analysis: SpeechAnalysisMetadata,
  libraryId = DEFAULT_LIBRARY_ID,
): string | null {
  const db = getDesktopDatabase();
  const existing = db
    .prepare(`SELECT id, ai_metadata FROM media_items WHERE library_id = ? AND source_path = ? LIMIT 1`)
    .get(libraryId, videoPath) as { id: string; ai_metadata: string | null } | undefined;
  if (!existing) return null;
  const base = parseJson(existing.ai_metadata);
  const merged = mergeMetadataV2(base, { speech_analysis: analysis });
  const now = analysis.processed_at;
  db.prepare(
    `UPDATE media_items
     SET ai_metadata = ?,
         speech_analysis_processed_at = ?,
         speech_analysis_failed_at = NULL,
         speech_analysis_error = NULL,
         updated_at = ?
     WHERE id = ?`,
  ).run(JSON.stringify(merged), now, now, existing.id);
  try {
    syncFtsForMediaItem(existing.id, libraryId);
  } catch {
    // FTS update is best-effort.
  }
  return existing.id;
}

export function markSpeechAnalysisFailed(
  videoPath: string,
  errorMessage: string,
  libraryId = DEFAULT_LIBRARY_ID,
): void {
  const db = getDesktopDatabase();
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE media_items
     SET speech_analysis_failed_at = ?,
         speech_analysis_error = ?,
         updated_at = ?
     WHERE library_id = ? AND source_path = ?`,
  ).run(now, errorMessage.slice(0, MAX_ERROR_LENGTH), now, libraryId, videoPath);
}

/** Paths whose latest speech run succeeded. Failed-only rows are not included. */
export function getSpeechAnalyzedPaths(videoPaths: string[], libraryId = DEFAULT_LIBRARY_ID): Set<string> {
  const analyzed = new Set<string>();
  if (videoPaths.length === 0) return analyzed;
  const db = getDesktopDatabase();
  for (let index = 0; index < videoPaths.length; index += IN_CHUNK_SIZE) {
    const chunk = videoPaths.slice(index, index + IN_CHUNK_SIZE);
    const placeholders = chunk.map(() => "?").join(", ");
    const rows = db
      .prepare(
        `SELECT source_path FROM media_items
         WHERE library_id = ?
           AND speech_analysis_processed_at IS NOT NULL
           AND (
             speech_analysis_failed_at IS NULL
             OR speech_analysis_processed_at > speech_analysis_failed_at
           )
           AND source_path IN (${placeholders})`,
      )
      .all(libraryId, ...chunk) as Array<{ source_path: string }>;
    for (const row of rows) analyzed.add(row.source_path);
  }
  return analyzed;
}

function parseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
