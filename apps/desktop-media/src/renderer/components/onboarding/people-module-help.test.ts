import { describe, expect, it } from "vitest";
import { GUIDED_SLIDE_IDS } from "./guided-slide-catalog";
import {
  buildPeopleModuleHelpDeck,
  getPeopleModuleHelpInitialSlideIndex,
  PEOPLE_MODULE_SHOW_UPCOMING_SLIDES,
} from "./people-module-help";

describe("people-module-help", () => {
  it("buildPeopleModuleHelpDeck excludes upcoming slides when flag is false", () => {
    expect(PEOPLE_MODULE_SHOW_UPCOMING_SLIDES).toBe(false);
    const deck = buildPeopleModuleHelpDeck();
    expect(deck.slides.map((s) => s.id)).toEqual([
      GUIDED_SLIDE_IDS.peopleFacesCore,
      GUIDED_SLIDE_IDS.peopleTagsVisualOverview,
      GUIDED_SLIDE_IDS.peopleTagsStepsOneTwo,
      GUIDED_SLIDE_IDS.peopleTagsStepsThreeFour,
      GUIDED_SLIDE_IDS.peopleTagsFaceTaggingUntagged,
      GUIDED_SLIDE_IDS.peopleTagsFaceTaggingTaggedViewer,
      GUIDED_SLIDE_IDS.peopleTagsSmartAlbumGroups,
    ]);
  });

  it("getPeopleModuleHelpInitialSlideIndex maps tabs to first visible matching slide", () => {
    const visible = [
      GUIDED_SLIDE_IDS.peopleFacesCore,
      GUIDED_SLIDE_IDS.peopleTagsVisualOverview,
      GUIDED_SLIDE_IDS.peopleTagsStepsOneTwo,
      GUIDED_SLIDE_IDS.peopleTagsStepsThreeFour,
      GUIDED_SLIDE_IDS.peopleTagsFaceTaggingUntagged,
      GUIDED_SLIDE_IDS.peopleTagsFaceTaggingTaggedViewer,
      GUIDED_SLIDE_IDS.peopleTagsSmartAlbumGroups,
    ];
    expect(getPeopleModuleHelpInitialSlideIndex("people", visible)).toBe(0);
    expect(getPeopleModuleHelpInitialSlideIndex("tagged", visible)).toBe(1);
    expect(getPeopleModuleHelpInitialSlideIndex("untagged", visible)).toBe(4);
    expect(getPeopleModuleHelpInitialSlideIndex("groups", visible)).toBe(6);
  });
});
