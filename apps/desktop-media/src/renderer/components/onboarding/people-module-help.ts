import type { GuidedSlideDeck } from "../guided-content/guided-slide-types";
import { buildGuidedSlideDeckFromIds, GUIDED_SLIDE_IDS } from "./guided-slide-catalog";

/** When true, appends People groups + birth-date preview slides to the People module help deck. */
export const PEOPLE_MODULE_SHOW_UPCOMING_SLIDES = false;

export const PEOPLE_MODULE_HELP_UPCOMING_SLIDE_IDS: readonly string[] = [
  GUIDED_SLIDE_IDS.peopleGroupsUpcoming,
  GUIDED_SLIDE_IDS.peopleBirthDateUpcoming,
];

export const PEOPLE_MODULE_HELP_SLIDE_ORDER_FULL: readonly string[] = [
  GUIDED_SLIDE_IDS.peopleFacesCore,
  GUIDED_SLIDE_IDS.peopleTagsVisualOverview,
  GUIDED_SLIDE_IDS.peopleTagsStepsOneTwo,
  GUIDED_SLIDE_IDS.peopleTagsStepsThreeFour,
  GUIDED_SLIDE_IDS.peopleTagsFaceTaggingUntagged,
  GUIDED_SLIDE_IDS.peopleTagsFaceTaggingTaggedViewer,
  GUIDED_SLIDE_IDS.peopleTagsSmartAlbumGroups,
  ...PEOPLE_MODULE_HELP_UPCOMING_SLIDE_IDS,
];

export type PeopleModuleTab = "people" | "groups" | "tagged" | "untagged";

export function buildPeopleModuleHelpDeck(): GuidedSlideDeck {
  const slideIds = PEOPLE_MODULE_HELP_SLIDE_ORDER_FULL.filter(
    (id) =>
      PEOPLE_MODULE_SHOW_UPCOMING_SLIDES || !PEOPLE_MODULE_HELP_UPCOMING_SLIDE_IDS.includes(id),
  );
  return buildGuidedSlideDeckFromIds(slideIds, "people-faces-help", "People", "feature-help");
}

export function getPeopleModuleHelpInitialSlideIndex(
  tab: PeopleModuleTab,
  visibleSlideIds: readonly string[],
): number {
  const targetByTab: Record<PeopleModuleTab, string> = {
    people: GUIDED_SLIDE_IDS.peopleFacesCore,
    tagged: GUIDED_SLIDE_IDS.peopleTagsVisualOverview,
    untagged: GUIDED_SLIDE_IDS.peopleTagsFaceTaggingUntagged,
    groups: GUIDED_SLIDE_IDS.peopleTagsSmartAlbumGroups,
  };
  const targetId = targetByTab[tab];
  const idx = visibleSlideIds.indexOf(targetId);
  return idx >= 0 ? idx : 0;
}
