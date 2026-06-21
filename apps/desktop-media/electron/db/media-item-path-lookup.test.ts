import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

function canOpenSqlite(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3") as new (path: string) => { close: () => void };
    const db = new Database(":memory:");
    db.close();
    return true;
  } catch {
    return false;
  }
}

const HAS_SQLITE = canOpenSqlite();
const LIBRARY_ID = "local-default";

type ClientModule = typeof import("./client");
type LookupModule = typeof import("./media-item-path-lookup");

let client!: ClientModule;
let lookup!: LookupModule;
let tmpDir = "";

function insertMediaItem(sourcePath: string, id = "item-1"): void {
  const now = "2026-01-01T00:00:00.000Z";
  client
    .getDesktopDatabase()
    .prepare(
      `INSERT INTO media_items (
        id, library_id, source_path, filename, media_kind, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'image', ?, ?)`,
    )
    .run(id, LIBRARY_ID, sourcePath, path.win32.basename(sourcePath), now, now);
}

describe.skipIf(!HAS_SQLITE)("lookupActiveMediaItemBySourcePath", () => {
  beforeAll(async () => {
    client = await import("./client");
    lookup = await import("./media-item-path-lookup");
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "emk-path-lookup-"));
    client.initDesktopDatabase(tmpDir);
  });

  afterEach(() => {
    client.__closeDesktopDatabaseForTesting();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("finds a row by exact source_path", () => {
    const stored = path.win32.join("C:", "Photos", "photo.jpg");
    insertMediaItem(stored);

    const row = lookup.lookupActiveMediaItemBySourcePath(LIBRARY_ID, stored);
    expect(row?.id).toBe("item-1");
    expect(row?.sourcePath).toBe(stored);
  });

  it("finds a row when lookup uses alternate slash separators", () => {
    const stored = path.win32.join("C:", "Photos", "photo.jpg");
    insertMediaItem(stored);

    const forward = stored.replace(/\\/g, "/");
    const row = lookup.lookupActiveMediaItemBySourcePath(LIBRARY_ID, forward);
    expect(row?.id).toBe("item-1");
    expect(row?.sourcePath).toBe(stored);
  });

  it("returns undefined when no active row exists", () => {
    const row = lookup.lookupActiveMediaItemBySourcePath(
      LIBRARY_ID,
      path.win32.join("C:", "Photos", "missing.jpg"),
    );
    expect(row).toBeUndefined();
  });
});

describe.skipIf(!HAS_SQLITE || process.platform !== "win32")(
  "lookupActiveMediaItemBySourcePath (Windows case)",
  () => {
    beforeAll(async () => {
      client = await import("./client");
      lookup = await import("./media-item-path-lookup");
    });

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "emk-path-lookup-win-"));
      client.initDesktopDatabase(tmpDir);
    });

    afterEach(() => {
      client.__closeDesktopDatabaseForTesting();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("finds a row with case-insensitive path match on Windows", () => {
      const stored = path.win32.join("C:", "Photos", "Photo.JPG");
      insertMediaItem(stored, "case-item");

      const row = lookup.lookupActiveMediaItemBySourcePath(
        LIBRARY_ID,
        path.win32.join("c:", "photos", "photo.jpg"),
      );
      expect(row?.id).toBe("case-item");
    });
  },
);
