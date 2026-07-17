import { describe, expect, it } from "vitest";
import { buildTvBroadcastHelpDeck, TV_BROADCAST_HELP_SLIDE_ORDER } from "./tv-broadcast-help";
import { GUIDED_SLIDE_IDS } from "../onboarding/guided-slide-catalog";

describe("tv-broadcast-help", () => {
  it("builds a feature-help deck with overview, connect, and PIN slides", () => {
    const deck = buildTvBroadcastHelpDeck();
    expect(deck.flowTitle).toBe("Broadcast to TV");
    expect(deck.deckCategory).toBe("feature-help");
    expect(deck.slides.map((s) => s.id)).toEqual([...TV_BROADCAST_HELP_SLIDE_ORDER]);
    expect(TV_BROADCAST_HELP_SLIDE_ORDER).toContain(GUIDED_SLIDE_IDS.tvBroadcastOverview);
  });
});
