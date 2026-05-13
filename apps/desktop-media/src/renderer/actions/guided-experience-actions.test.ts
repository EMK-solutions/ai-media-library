import { describe, expect, it, vi } from "vitest";
import { markGuidedHelpTopicDismissed } from "./guided-experience-actions";
import { createDesktopStore } from "../stores/desktop-store";
import { GUIDED_HELP_TOPIC_DOCUMENTS_INVOICES_RECEIPTS } from "../../shared/guided-experience-types";

describe("markGuidedHelpTopicDismissed", () => {
  it("sets helpWizardDismissed for the topic", () => {
    const store = createDesktopStore();
    markGuidedHelpTopicDismissed(store, GUIDED_HELP_TOPIC_DOCUMENTS_INVOICES_RECEIPTS);
    expect(
      store.getState().guidedExperienceSettings.helpTopics[GUIDED_HELP_TOPIC_DOCUMENTS_INVOICES_RECEIPTS]
        ?.helpWizardDismissed,
    ).toBe(true);
    expect(
      store.getState().guidedExperienceSettings.helpTopics[GUIDED_HELP_TOPIC_DOCUMENTS_INVOICES_RECEIPTS]
        ?.dismissedAt,
    ).toEqual(expect.any(String));
  });

  it("is idempotent when already dismissed", () => {
    const store = createDesktopStore();
    const spy = vi.spyOn(store, "setState");
    markGuidedHelpTopicDismissed(store, GUIDED_HELP_TOPIC_DOCUMENTS_INVOICES_RECEIPTS);
    const first =
      store.getState().guidedExperienceSettings.helpTopics[GUIDED_HELP_TOPIC_DOCUMENTS_INVOICES_RECEIPTS]
        ?.dismissedAt;
    markGuidedHelpTopicDismissed(store, GUIDED_HELP_TOPIC_DOCUMENTS_INVOICES_RECEIPTS);
    const second =
      store.getState().guidedExperienceSettings.helpTopics[GUIDED_HELP_TOPIC_DOCUMENTS_INVOICES_RECEIPTS]
        ?.dismissedAt;
    expect(first).toBe(second);
    spy.mockRestore();
  });
});
