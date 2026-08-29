---
id: F-12-01
module: 12-onboarding-and-help
title: First-run welcome
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/onboarding/desktop-product-welcome-layer.tsx
  - apps/desktop-media/src/renderer/components/onboarding/product-welcome-modal.tsx
  - apps/desktop-media/src/renderer/hooks/use-product-welcome-auto-open.ts
  - apps/desktop-media/src/renderer/components/onboarding/product-welcome-content.ts
related:
  - F-12-02
  - F-12-03
  - F-13-03
  - F-13-04
---

# First-run welcome

> On the first launch, show a short slide deck about what the library does, that work stays
> on this PC, and what to do next — then do not show it again.

## 1. Summary

Until the user has finished or dismissed the welcome wizard, the app opens a modal titled
**Welcome to AI Media Library** after settings have loaded from disk. The shipped deck
(variant **a**, ten slides) covers search, faces, analysis, privacy, licenses, Ollama,
geolocation/dates/rotation, smart albums, and next steps (add a folder, roll out AI on a
small set). Closing it marks the intro complete so it will not auto-open again.

Settings → **Features overview** opens the same slides without recording completion, so the
user can revisit copy without pretending they never finished first run. Playwright sets
`skipAutoProductIntro` so other E2E tests are not blocked by the overlay.

## 2. User stories

- **As a new installer** I want an explanation before I add folders, **so that** I do not
  start the slowest pipeline first.
- **As someone who closed the wizard too fast** I want **Features overview** in Settings,
  **so that** I can read the slides again.
- This is **not** a setup wizard that installs Ollama or downloads GeoNames by itself.

## 3. Scope

**In scope**

- Auto-open after hydration, completion persistence, preview from Settings
- Default deck content and slide order
- Links from slides into the models sheet and Ollama download page

**Out of scope**

- Per-feature auto-help — [Guided help](02-guided-help.md)
- Actually provisioning Ollama — [Local AI runtime](../13-platform-and-distribution/03-local-ai-runtime.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Slide modal chrome | [Guided help](02-guided-help.md) |
| Models / licenses table | [AI models & licenses](03-ai-models-and-licenses.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-12-01.1 | Auto-open | Overlay until intro is completed | shipped |
| F-12-01.2 | Completion flag | Close persists `productIntro.completed` | shipped |
| F-12-01.3 | Settings preview | **Features overview** without completing | shipped |
| F-12-01.4 | Deck variants | a (shipped default), b and c for copy experiments | experimental (b/c) |

## 5. User journeys

### J-12-01-1 — First launch

**Trigger:** app start with no completed product intro.
**Preconditions:** settings hydrated; runtime flag `skipAutoProductIntro` is false.

1. The welcome modal opens over the empty Folders workspace (“Select a folder to view media”
   can still be seen behind it).
2. The user steps through slides (arrows or buttons; Escape closes).
3. Closing on any slide marks the intro complete.

**Outcome:** later launches skip auto-open.

**Alternate paths**

- E2E / `EMK_E2E_SKIP_PRODUCT_INTRO=1` → no auto-open.
- Intro already `completed` → no auto-open.

**Failure paths**

- `getDesktopRuntimeFlags` fails → the wizard still opens (fail open), unless intro was
  already completed.

### J-12-01-2 — Preview from Settings

**Trigger:** **Features overview**.

1. The same modal opens.
2. Close does **not** call mark-complete unless auto-open was also showing.

**Outcome:** first-run state unchanged if the user had not finished it; already-complete users
just reread the deck.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Welcome overlay | First launch or Settings preview | Flow title, slides, models sheet from a slide action | `desktop-product-welcome-layer.tsx`, `product-welcome-modal.tsx` |

**Default slide order (variant a)**

1. Feature highlights (search, faces, analysis, categories, invoices, geolocation, smart albums)
2. Data privacy and ownership
3. Software and AI models (link: Models list)
4. People and faces
5. Search in plain language
6. Ollama — local AI on this PC (link: ollama.com/download)
7. Geolocation, dates, and straightening
8. AI image analysis
9. Smart albums (early stage)
10. Next steps

Defined in `apps/desktop-media/src/renderer/components/onboarding/guided-slide-catalog.ts`
(`PRODUCT_WELCOME_SLIDE_ORDER`).

**States**

| State | What the user sees |
|---|---|
| Not yet hydrated | No auto-open yet |
| Open | Modal, keyboard arrows / Escape |
| Completed | No auto-open |

**UX notes**

- After the first slide, the large heading is the slide headline and **Welcome to AI Media
  Library** is the smaller line.
- Shipped variant is **a** (`DEFAULT_PRODUCT_WELCOME_VARIANT`). Variants **b** (4 slides) and
  **c** (9 slides) exist for copy comparison; switching is a code constant, not a Settings
  control.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Auto-open runs only after `persistedSettingsHydrated` and when `productIntro.completed` is not true. | Avoid flashing the wizard, then hiding it, and avoid using empty persistence. | `use-product-welcome-auto-open.ts` |
| BR-2 | `skipAutoProductIntro` (env `EMK_E2E_SKIP_PRODUCT_INTRO=1`) suppresses auto-open. | Automated tests need a clear window. | `fs-handlers.ts`, hook |
| BR-3 | Dismissing the auto-opened wizard sets `completed`, schema `version` 1, `dismissedAt`, and `lastDeckVariant`. | First run is once per schema until a future re-prompt is wired. | `guided-experience-actions.ts` |
| BR-4 | Mark complete is idempotent: a second dismiss keeps the original `dismissedAt` and variant. | Preview or double-close must not rewrite history. | `guided-experience-actions.test.ts` |
| BR-5 | Settings preview sets `productWelcomePreviewOpen` and does not mark complete by itself. | Re-reading help ≠ finishing onboarding. | `desktop-product-welcome-layer.tsx` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| (none on the Settings cards) | `guidedExperience.helpTopics: {}`; no `productIntro` until dismissed | Empty means “not completed” | n/a |

`CURRENT_PRODUCT_INTRO_SCHEMA_VERSION` is **1**. Re-prompt when the schema changes is
documented in types and **not wired**.

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| `guidedExperience.productIntro` | `media-settings.json` | Whether welcome auto-open is done |

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Settings hydration | Knowing completion | Wizard waits, then opens if still incomplete |
| Browser / network | Ollama download link | Link no-ops if the OS cannot open a URL |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `markProductIntroDismissed` | store, deck variant `a` \| `b` \| `c` | Persist completion |
| `getDesktopRuntimeFlags` | — | Includes `skipAutoProductIntro` |

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/product-welcome-first-launch.spec.ts` | Heading and “Contextual image search” before a library is added (`e2eAllowAutoProductIntro`) |
| Unit | `apps/desktop-media/src/renderer/components/onboarding/product-welcome-content.test.ts` | Title, category, variant a ids, counts 10 / 4 / 9 |
| Unit | `guided-experience-actions.test.ts` | Complete flag, idempotency |

**Coverage gaps:** Settings preview vs complete; skip flag behaviour; schema re-prompt.

## 13. Known limitations & open questions

- **Limitation:** closing on slide 1 still counts as completed — there is no “remind me next
  time”.
- **Limitation:** the roadmap file still says Phase B (global intro) is planned.
- **Open question:** when schema version bumps, whether existing `completed` users should see
  the wizard again (types allow it; UI does not).

## 14. References

- Module: [Onboarding & Help](README.md)
- [Guided help](02-guided-help.md)
- Roadmap (partially stale): `docs/ROADMAP/onboarding-and-guided-help.md`
- Recommended setup: [`../JOURNEYS.md`](../JOURNEYS.md) (J-X1 step 0)
