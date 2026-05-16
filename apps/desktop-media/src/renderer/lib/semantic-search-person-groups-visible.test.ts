import { describe, expect, it } from "vitest";
import {
  getSemanticSearchVisiblePersonGroupIds,
  semanticSearchPersonGroupsShouldOfferShowAll,
  type PersonGroupListMeta,
} from "./semantic-search-person-groups-visible";

const groups: PersonGroupListMeta[] = [
  { id: "a", label: "Alpha" },
  { id: "b", label: "Bravo" },
  { id: "c", label: "Charlie" },
  { id: "d", label: "Delta" },
];

describe("semantic-search-person-groups-visible", () => {
  it("shows first groups alphabetically when collapsed with no filter", () => {
    expect(
      getSemanticSearchVisiblePersonGroupIds({
        allGroups: groups,
        nameFilterTrimmed: "",
        groupsListExpanded: false,
        lastToggledIds: [],
        selectedGroupIds: [],
      }),
    ).toEqual(["a", "b", "c"]);
  });

  it("includes selected groups when they would be hidden in collapsed mode", () => {
    expect(
      getSemanticSearchVisiblePersonGroupIds({
        allGroups: groups,
        nameFilterTrimmed: "",
        groupsListExpanded: false,
        lastToggledIds: [],
        selectedGroupIds: ["d"],
      }),
    ).toEqual(["a", "b", "c", "d"]);
  });

  it("filters by name when search text is set", () => {
    expect(
      getSemanticSearchVisiblePersonGroupIds({
        allGroups: groups,
        nameFilterTrimmed: "lt",
        groupsListExpanded: false,
        lastToggledIds: [],
        selectedGroupIds: [],
      }),
    ).toEqual(["d"]);
  });

  it("offers show all when collapsed hides some groups", () => {
    expect(
      semanticSearchPersonGroupsShouldOfferShowAll({
        allGroups: groups,
        nameFilterTrimmed: "",
        groupsListExpanded: false,
        lastToggledIds: [],
      }),
    ).toBe(true);
  });

  it("does not offer show all when list is expanded", () => {
    expect(
      semanticSearchPersonGroupsShouldOfferShowAll({
        allGroups: groups,
        nameFilterTrimmed: "",
        groupsListExpanded: true,
        lastToggledIds: [],
      }),
    ).toBe(false);
  });
});
