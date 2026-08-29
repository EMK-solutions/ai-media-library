---
id: F-12-02
module: 12-onboarding-and-help
title: Guided help
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/guided-content/guided-slide-modal.tsx
  - apps/desktop-media/src/renderer/actions/guided-experience-actions.ts
  - apps/desktop-media/src/shared/guided-experience-types.ts
  - apps/desktop-media/src/renderer/hooks/use-invoices-receipts-auto-help.ts
  - apps/desktop-media/src/renderer/components/onboarding/guided-slide-catalog.ts
related:
  - F-12-01
  - F-07-01
  - F-10-01
  - F-04-04
---

# Guided help

> Open a feature’s own slide deck from Help — and, for Invoices & Receipts, show it once
> automatically the first time that screen is used.

## 1. Summary

Guided help reuses one modal (`GuidedSlideModal`) for feature walkthroughs. **Invoices &
Receipts** auto-opens after settings load if that topic has not been dismissed; closing it
(any slide, including incomplete) sets `documents:invoices-receipts` so it will not auto-open
again. The (?) control still opens the same deck any time.

**People** help is manual from each People tab and jumps to a relevant slide. **TV broadcast**
Help is manual on the start/stop dialogs. The topic id `broadcast:tv` is reserved in types but
is not written when TV Help closes. People help is not a typed topic at all.

## 2. User stories

- **As a first-time Documents user** I want the wizard without hunting for (?),
  **so that** an empty invoices table is not mistaken for a broken screen.
- **As someone tagging faces** I want People help that starts on the tab I am on,
  **so that** I am not sent back to slide one every time.
- **As someone broadcasting to a TV** I want Help on the dialog I already have open,
  **so that** URL, PIN and firewall are explained in place.

## 3. Scope

**In scope**

- Shared modal, keyboard, topic dismissal for invoices
- Catalog of reusable slides; People, TV, and Documents decks
- Auto-open rules that exist in code today

**Out of scope**

- Global first-run deck — [First-run welcome](01-first-run-welcome.md)
- Milestone “nudge” banners (reserved `milestones` map, unused)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Invoices table itself | [Invoices & receipts](../07-documents/01-invoices-and-receipts.md) |
| TV start/stop | [TV broadcast](../10-sharing-and-presentation/01-tv-broadcast.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-12-02.1 | Shared slide modal | Overlay, prev/next, Escape | shipped |
| F-12-02.2 | Invoices auto-help | Once per machine until dismissed | shipped |
| F-12-02.3 | People module help | Tab-aware starting slide | shipped |
| F-12-02.4 | TV broadcast help | Three slides from dialog Help | shipped |

## 5. User journeys

### J-12-02-1 — First visit to Invoices & Receipts

**Trigger:** sidebar **Documents** → **Invoices & Receipts**.
**Preconditions:** settings hydrated; topic not dismissed.

1. The help modal opens (sample/explanation deck).
2. The user closes it or finishes the slides.
3. `helpWizardDismissed` is stored for `documents:invoices-receipts`.

**Outcome:** later visits stay on the table; (?) still works.

**Alternate paths**

- Already dismissed → no auto-open.
- (?) clicked later → same deck, dismiss stays true.

### J-12-02-2 — People help

**Trigger:** help control on People / Tagged faces / Untagged faces / People groups.

1. Modal **People** opens at a slide chosen for that tab.
2. Close does not persist a guided-experience topic.

### J-12-02-3 — TV help

**Trigger:** Help on a TV broadcast dialog.

1. Deck **Broadcast to TV**: what it is, URL/port, PIN and firewall.
2. Close does not persist `broadcast:tv`.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Guided slide modal | Any help entry | Title, icon, blocks, arrows | `guided-slide-modal.tsx` |
| Invoices help | Auto or (?) | Documents-specific slides | `invoices-receipts-help-modal.tsx` |
| People help | People (?) | `buildPeopleModuleHelpDeck()` | `people-module-help.ts` |
| TV help | Dialog Help | `buildTvBroadcastHelpDeck()` | `tv-broadcast-help.ts` |

**States**

| State | What the user sees |
|---|---|
| Auto-open blocked on hydration | No flash of help before flags exist |
| Last slide | Next control inert |
| Upcoming People slides | Hidden (`PEOPLE_MODULE_SHOW_UPCOMING_SLIDES` is false) |

**UX notes**

- Arrow keys and Escape work while the modal is open.
- In-slide actions can open the models sheet or the Ollama download page
  (`handleGuidedSlideDeckAction`).

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Known help topic ids are only `documents:invoices-receipts` and `broadcast:tv`. | Typed persistence; do not invent extra keys in settings. | `guided-experience-types.ts` |
| BR-2 | Invoices auto-open runs at most once until that topic is dismissed; any close counts. | Avoid looping the wizard every visit. | `use-invoices-receipts-auto-help.ts`, `markGuidedHelpTopicDismissed` |
| BR-3 | Dismissal waits for `persistedSettingsHydrated`. | Same as welcome: empty flags must not auto-open. | invoices hook |
| BR-4 | Dismiss is idempotent (same `dismissedAt`). | Double-close must not churn settings writes. | `guided-experience-actions.test.ts` |
| BR-5 | `broadcast:tv` is not updated when TV Help closes. | Code never calls mark-dismiss for that id today. | `TvBroadcastDialogs.tsx` vs types |
| BR-6 | Default `guidedExperience` is `{ helpTopics: {} }`. | Missing file ≡ nothing dismissed. | `DEFAULT_GUIDED_EXPERIENCE_SETTINGS` |

## 8. Settings & defaults

None on the Settings page. Persistence:

| Key | Default | Effect |
|---|---|---|
| `guidedExperience.helpTopics` | `{}` | Missing topic ⇒ auto-open allowed (invoices) |
| `helpWizardDismissed` | unset/false | When true, invoices auto-open stops |

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Per-topic dismissal | `media-settings.json` → `guidedExperience.helpTopics` | Invoices wizard will not surprise the user again |

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Settings save subscription | Keeping dismissal | Wizard could auto-open again next launch |
| Feature workspace mounted | Auto-open | No invoices hook ⇒ no auto wizard |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `markGuidedHelpTopicDismissed` | store, `GuidedHelpTopicId` | Persist dismissal |

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| Unit | `apps/desktop-media/src/renderer/actions/guided-experience-actions.test.ts` | Invoices dismiss + idempotency |
| Unit | `apps/desktop-media/src/renderer/components/onboarding/guided-slide-catalog.test.ts` | People deck, welcome order people-before-search |
| Unit | `tv-broadcast-help.test.ts` | TV slide ids present |
| Unit | `invoices-receipts-help-content.test.ts` | Documents deck titles/counts |
| Unit | `guided-experience-sanitize.test.ts` | Bad JSON → defaults |

**Coverage gaps:** no E2E for invoices auto-open/dismiss; People (?) untested in Playwright.

## 13. Known limitations & open questions

- **Limitation:** only invoices auto-opens; People and TV never do.
- **Limitation:** `broadcast:tv` is a dead persistence key until TV Help is wired to it.
- **Open question:** whether People should become a topic id so auto-open can be added later
  without a new settings shape.

## 14. References

- Module: [Onboarding & Help](README.md)
- `docs/ROADMAP/onboarding-and-guided-help.md`
- [Invoices & receipts](../07-documents/01-invoices-and-receipts.md)
