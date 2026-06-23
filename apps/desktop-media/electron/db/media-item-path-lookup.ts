import path from "node:path";
import type Database from "better-sqlite3";
import { getDesktopDatabase } from "./client";

export interface ActiveMediaItemPathMatch {
  id: string;
  sourcePath: string;
  ai_metadata: string | null;
}

export interface ActiveMediaItemPathAnalysisMatch {
  id: string;
  sourcePath: string;
  photo_taken_at: string | null;
  photo_taken_precision: string | null;
  file_created_at: string | null;
  ai_metadata: string | null;
}

function queryActiveMediaItemByPath<T>(
  db: Database.Database,
  libraryId: string,
  filePath: string,
  selectColumns: string,
): T | undefined {
  const normalized = path.normalize(filePath);
  const baseSql = `SELECT ${selectColumns} FROM media_items WHERE library_id = ? AND deleted_at IS NULL AND`;

  const asRow = (row: unknown): T | undefined => (row as T | undefined) ?? undefined;

  let row = asRow(db.prepare(`${baseSql} source_path = ? LIMIT 1`).get(libraryId, normalized));
  if (row) {
    return row;
  }

  const slashVariant = normalized.includes("\\")
    ? normalized.replace(/\\/g, "/")
    : normalized.replace(/\//g, "\\");
  if (slashVariant !== normalized) {
    row = asRow(db.prepare(`${baseSql} source_path = ? LIMIT 1`).get(libraryId, slashVariant));
  }
  if (row) {
    return row;
  }

  if (process.platform === "win32") {
    row = asRow(
      db.prepare(`${baseSql} lower(source_path) = lower(?) LIMIT 1`).get(libraryId, normalized),
    );
  }

  return row;
}

/** Resolve an active catalog row by file path (normalize, slash variants, case on Windows). */
export function lookupActiveMediaItemBySourcePath(
  libraryId: string,
  filePath: string,
  db: Database.Database = getDesktopDatabase(),
): ActiveMediaItemPathMatch | undefined {
  return queryActiveMediaItemByPath<ActiveMediaItemPathMatch>(
    db,
    libraryId,
    filePath,
    "id, source_path AS sourcePath, ai_metadata",
  );
}

/** Same path rules as star-rating lookup; includes fields used by path analysis. */
export function lookupActiveMediaItemForPathAnalysis(
  libraryId: string,
  filePath: string,
  db: Database.Database = getDesktopDatabase(),
): ActiveMediaItemPathAnalysisMatch | undefined {
  return queryActiveMediaItemByPath<ActiveMediaItemPathAnalysisMatch>(
    db,
    libraryId,
    filePath,
    "id, source_path AS sourcePath, photo_taken_at, photo_taken_precision, file_created_at, ai_metadata",
  );
}
