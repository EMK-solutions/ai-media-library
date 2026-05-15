import { describe, expect, it } from "vitest";
import { albumFilterActiveChipClasses, albumFilterActiveInputClasses } from "./album-filter-active-styles";

describe("albumFilterActiveStyles", () => {
  it("exports non-empty amber-related class strings for filter emphasis", () => {
    expect(albumFilterActiveInputClasses.length).toBeGreaterThan(10);
    expect(albumFilterActiveInputClasses).toContain("amber");
    expect(albumFilterActiveChipClasses).toContain("amber");
  });
});
