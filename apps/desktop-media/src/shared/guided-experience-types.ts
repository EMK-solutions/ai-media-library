/**
 * Persisted guided help / onboarding overlap (see `AppSettings.guidedExperience`).
 * Topic ids use `domain:feature`; add new union members when a feature ships content.
 */
export type GuidedHelpTopicId = "documents:invoices-receipts";

export const GUIDED_HELP_TOPIC_DOCUMENTS_INVOICES_RECEIPTS = "documents:invoices-receipts" satisfies GuidedHelpTopicId;

export const GUIDED_HELP_TOPIC_IDS: readonly GuidedHelpTopicId[] = [GUIDED_HELP_TOPIC_DOCUMENTS_INVOICES_RECEIPTS];

export interface GuidedHelpTopicState {
  /** True after the user closes the help wizard (auto or manual); suppresses future auto-open. */
  helpWizardDismissed: boolean;
  /** ISO timestamp when dismissed (optional diagnostics / future analytics). */
  dismissedAt?: string;
}

/** Reserved for Phase B — global first-run intro (shape only; not wired yet). */
export interface GuidedProductIntroState {
  completed?: boolean;
  skippedAtStep?: number;
  version?: number;
}

/** Reserved for Phase C — onboarding milestones (shape only; not wired yet). */
export type GuidedMilestonesState = Record<string, unknown>;

export interface GuidedExperienceSettings {
  helpTopics: Partial<Record<GuidedHelpTopicId, GuidedHelpTopicState>>;
  productIntro?: GuidedProductIntroState;
  milestones?: GuidedMilestonesState;
}

export const DEFAULT_GUIDED_EXPERIENCE_SETTINGS: GuidedExperienceSettings = {
  helpTopics: {},
};
