import { describe, expect, it } from "vitest";
import {
  buildGuidedSlideDeckFromIds,
  GUIDED_SLIDE_IDS,
  PRODUCT_WELCOME_SLIDE_ORDER,
} from "./guided-slide-catalog";
import { buildPeopleModuleHelpDeck } from "./people-module-help";

describe("guided-slide-catalog", () => {
  it("buildPeopleModuleHelpDeck builds feature-help deck starting with shared people core", () => {
    const deck = buildPeopleModuleHelpDeck();
    expect(deck.deckCategory).toBe("feature-help");
    expect(deck.flowTitle).toBe("People");
    expect(deck.slides[0]?.id).toBe(GUIDED_SLIDE_IDS.peopleFacesCore);
  });

  it("getGuidedSlideConfig returns people tags visual overview for catalog id", () => {
    const deck = buildGuidedSlideDeckFromIds(
      [GUIDED_SLIDE_IDS.peopleTagsVisualOverview],
      "people-faces-help",
      "People",
      "feature-help",
    );
    expect(deck.slides[0]?.slideHeadline).toBe("People tags");
    expect(deck.slides[0]?.featureHighlights?.length).toBe(4);
  });

  it("getGuidedSlideConfig returns people tags steps with numbered block titles", () => {
    const deck = buildGuidedSlideDeckFromIds(
      [GUIDED_SLIDE_IDS.peopleTagsStepsOneTwo],
      "people-faces-help",
      "People",
      "feature-help",
    );
    expect(deck.slides[0]?.blocks[0]?.title).toBe("1. Run face detection");
  });

  it("product welcome flow orders people before search", () => {
    const peopleIdx = PRODUCT_WELCOME_SLIDE_ORDER.indexOf(GUIDED_SLIDE_IDS.peopleFacesCore);
    const searchIdx = PRODUCT_WELCOME_SLIDE_ORDER.indexOf(GUIDED_SLIDE_IDS.searchPlainLanguage);
    expect(peopleIdx).toBeGreaterThan(-1);
    expect(searchIdx).toBeGreaterThan(-1);
    expect(peopleIdx).toBeLessThan(searchIdx);
  });
});
