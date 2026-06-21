import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./keyword-search", () => ({
  syncFtsForMediaItem: vi.fn(),
}));

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
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_IMAGE = path.join(HERE, "../../test-assets/e2e-photos/face-detect-sample-01.jpg");
const FIXTURE_VIDEO = path.join(HERE, "../../test-assets/e2e-media-mixed/media-2.mp4");

type ClientModule = typeof import("./client");
type StarRatingModule = typeof import("./media-item-star-rating-update");

let client!: ClientModule;
let starRating!: StarRatingModule;
let tmpDir = "";

function insertMediaItem(args: {
  id: string;
  sourcePath: string;
  starRating?: number | null;
  mediaKind?: "image" | "video";
}): void {
  const now = "2026-01-01T00:00:00.000Z";
  client
    .getDesktopDatabase()
    .prepare(
      `INSERT INTO media_items (
        id, library_id, source_path, filename, star_rating, media_kind, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      args.id,
      LIBRARY_ID,
      args.sourcePath,
      path.basename(args.sourcePath),
      args.starRating ?? null,
      args.mediaKind ?? "image",
      now,
      now,
    );
}

describe.skipIf(!HAS_SQLITE)("updateMediaItemStarRatingInDb", () => {
  beforeAll(async () => {
    client = await import("./client");
    starRating = await import("./media-item-star-rating-update");
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "emk-star-rating-"));
    client.initDesktopDatabase(tmpDir);
  });

  afterEach(() => {
    client.__closeDesktopDatabaseForTesting();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("updates star_rating for an existing catalog row", async () => {
    const sourcePath = path.win32.join("C:", "Photos", "rated.jpg");
    insertMediaItem({ id: "rated", sourcePath, starRating: 2 });

    const result = await starRating.updateMediaItemStarRatingInDb({
      sourcePath,
      starRating: 4,
      libraryId: LIBRARY_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.metadata.starRating).toBe(4);

    const row = client
      .getDesktopDatabase()
      .prepare(`SELECT star_rating FROM media_items WHERE id = ?`)
      .get("rated") as { star_rating: number };
    expect(row.star_rating).toBe(4);
  });

  it("resolves slash variants when updating an existing row", async () => {
    const stored = path.win32.join("C:", "Photos", "variant.jpg");
    insertMediaItem({ id: "variant", sourcePath: stored, starRating: 1 });

    const result = await starRating.updateMediaItemStarRatingInDb({
      sourcePath: stored.replace(/\\/g, "/"),
      starRating: 3,
      libraryId: LIBRARY_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.metadata.starRating).toBe(3);
  });

  it("rejects invalid starRating values", async () => {
    const result = await starRating.updateMediaItemStarRatingInDb({
      sourcePath: path.win32.join("C:", "Photos", "any.jpg"),
      starRating: 6,
      libraryId: LIBRARY_ID,
    });
    expect(result).toEqual({ ok: false, error: "starRating must be an integer from 0 to 5." });
  });

  it("auto-catalogs a missing video file then updates star rating", async () => {
    if (!fs.existsSync(FIXTURE_VIDEO)) {
      return;
    }

    const videoPath = path.join(tmpDir, "clip.mp4");
    fs.copyFileSync(FIXTURE_VIDEO, videoPath);

    const result = await starRating.updateMediaItemStarRatingInDb({
      sourcePath: videoPath,
      starRating: 5,
      libraryId: LIBRARY_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.metadata.starRating).toBe(5);
    expect(result.metadata.mediaKind).toBe("video");
  });

  it("auto-catalogs a missing image file then updates star rating", async () => {
    if (!fs.existsSync(FIXTURE_IMAGE)) {
      return;
    }

    const imagePath = path.join(tmpDir, "new-photo.jpg");
    fs.copyFileSync(FIXTURE_IMAGE, imagePath);

    const result = await starRating.updateMediaItemStarRatingInDb({
      sourcePath: imagePath,
      starRating: 2,
      libraryId: LIBRARY_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.metadata.starRating).toBe(2);
  });
});
