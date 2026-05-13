import type { GuidedHelpTopicId } from "../../shared/guided-experience-types";
import type { DesktopStore } from "../stores/desktop-store";

/** Marks a guided help topic as dismissed (persists via settings auto-save). */
export function markGuidedHelpTopicDismissed(store: DesktopStore, topicId: GuidedHelpTopicId): void {
  store.getState().markGuidedHelpTopicWizardDismissed(topicId);
}
