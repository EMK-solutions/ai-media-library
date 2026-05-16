import { describe, expect, it } from "vitest";
import type { SmartAlbumRootKind } from "@emk/shared-contracts";
import {
  SMART_ALBUM_AUTO_OPEN_FILTERS_DEFAULTS,
  smartAlbumAutoOpenFilterPanel,
} from "./smart-album-auto-open-filter-panel";

describe("smartAlbumAutoOpenFilterPanel", () => {
  it("matches SMART_ALBUM_AUTO_OPEN_FILTERS_DEFAULTS for every root kind", () => {
    (Object.keys(SMART_ALBUM_AUTO_OPEN_FILTERS_DEFAULTS) as SmartAlbumRootKind[]).forEach((kind) => {
      expect(smartAlbumAutoOpenFilterPanel(kind)).toBe(SMART_ALBUM_AUTO_OPEN_FILTERS_DEFAULTS[kind]);
    });
  });

  it("opens filters for Best of presets by default", () => {
    expect(SMART_ALBUM_AUTO_OPEN_FILTERS_DEFAULTS["country-year-area"]).toBe(false);
    expect(SMART_ALBUM_AUTO_OPEN_FILTERS_DEFAULTS["country-area-city"]).toBe(false);
    expect(SMART_ALBUM_AUTO_OPEN_FILTERS_DEFAULTS["best-of-year"]).toBe(true);
    expect(SMART_ALBUM_AUTO_OPEN_FILTERS_DEFAULTS["best-of-person-people"]).toBe(true);
    expect(SMART_ALBUM_AUTO_OPEN_FILTERS_DEFAULTS["best-of-people-group"]).toBe(true);
  });
});
