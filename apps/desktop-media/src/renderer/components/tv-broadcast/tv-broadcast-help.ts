import type { GuidedSlideDeck } from "../guided-content/guided-slide-types";
import { buildGuidedSlideDeckFromIds, GUIDED_SLIDE_IDS } from "../onboarding/guided-slide-catalog";

export const TV_BROADCAST_HELP_SLIDE_ORDER: readonly string[] = [
  GUIDED_SLIDE_IDS.tvBroadcastOverview,
  GUIDED_SLIDE_IDS.tvBroadcastConnect,
  GUIDED_SLIDE_IDS.tvBroadcastPinFirewall,
];

export function buildTvBroadcastHelpDeck(): GuidedSlideDeck {
  return buildGuidedSlideDeckFromIds(
    TV_BROADCAST_HELP_SLIDE_ORDER,
    "tv-broadcast-help",
    "Broadcast to TV",
    "feature-help",
  );
}
