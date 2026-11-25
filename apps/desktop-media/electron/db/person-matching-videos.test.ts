import { describe, expect, it, vi } from "vitest";
import type { SemanticSearchRow } from "./semantic-search";
import { mergePersonMatchingVideosIntoSearchResults } from "./person-matching-videos";

const getCalls: { sql: string; args: unknown[] }[] = [];

vi.mock("./client", () => ({
  getDesktopDatabase: () => ({
    prepare: (sql: string) => ({
      all: (...args: unknown[]) => {
        getCalls.push({ sql, args });
        return [
          {
            media_item_id: "vid-1",
            source_path: "C:\\clips\\party.mp4",
            filename: "party.mp4",
            city: null,
            country: null,
            people_detected: null,
            age_min: null,
            age_max: null,
            suggestion_score: 0.71,
          },
        ];
      },
    }),
  }),
}));

vi.mock("./folder-analysis-status", () => ({
  DEFAULT_LIBRARY_ID: "local-default",
}));

vi.mock("./media-item-sql-filters", () => ({
  appendEventAndLocationPredicates: () => undefined,
}));

import { listVideosMatchingPersonTags } from "./person-matching-videos";

function row(id: string, score: number): SemanticSearchRow {
  return {
    mediaItemId: id,
    path: `${id}.jpg`,
    name: `${id}.jpg`,
    score,
    city: null,
    country: null,
    peopleDetected: null,
    ageMin: null,
    ageMax: null,
  };
}

describe("mergePersonMatchingVideosIntoSearchResults", () => {
  it("appends videos after image hits and skips ids already ranked", () => {
    const merged = mergePersonMatchingVideosIntoSearchResults(
      [row("img-1", 0.9), row("vid-1", 0.4)],
      [row("vid-1", 0.71), row("vid-2", 0.6)],
    );
    expect(merged.map((item) => item.mediaItemId)).toEqual(["img-1", "vid-1", "vid-2"]);
  });
});

describe("listVideosMatchingPersonTags", () => {
  it("returns a video with a person suggestion even without a vision index", () => {
    getCalls.length = 0;
    const videos = listVideosMatchingPersonTags({
      personTagIds: ["tag-alice"],
      includeUnconfirmedFaces: true,
    });
    expect(videos).toEqual([
      {
        mediaItemId: "vid-1",
        path: "C:\\clips\\party.mp4",
        name: "party.mp4",
        score: 0.71,
        city: null,
        country: null,
        peopleDetected: null,
        ageMin: null,
        ageMax: null,
      },
    ]);
    expect(getCalls[0]?.sql).toContain("media_item_person_suggestions");
    expect(getCalls[0]?.sql).toContain("mi.media_kind = 'video'");
    expect(getCalls[0]?.sql).not.toContain("media_embeddings");
  });

  it("returns nothing when no person chips are set", () => {
    expect(listVideosMatchingPersonTags({})).toEqual([]);
  });
});
