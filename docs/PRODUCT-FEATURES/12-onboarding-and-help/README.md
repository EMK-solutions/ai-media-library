---
id: M-12
title: Onboarding & Help
status: shipped
last_reviewed: 2026-08-26
---

# Module 12 — Onboarding & Help

> Explain what the product is on first launch, then offer the same slide style of help when
> the user enters a feature that still needs a walkthrough.

## 1. Purpose & value

A local AI library has a recommended order of work (catalog, search index, faces, analysis)
that is not obvious from a blank window. This module owns the **first-run welcome** deck, the
reusable **guided slide** modal, **per-feature help** (Invoices & Receipts auto-open, People
and TV on demand), and the **AI models and licenses** sheet so third-party weights are not
buried in a README.

It does not run pipelines or add folders; it points at the rest of the product. Milestone
nudges (“you have tagged five people”) are reserved in settings and not wired yet.

## 2. User stories

- **As a new user** I want a short welcome before I add a folder, **so that** I know this is
  local, what Ollama is for, and what to do first.
- **As someone opening Invoices & Receipts the first time** I want a wizard over a sample
  table, **so that** I understand the screen before analysis has filled it.
- **As a returning user** I want Help on People or TV without being forced through welcome
  again, **so that** help stays available after onboarding is done.
- **As a license-conscious user** I want a models list with vendor links, **so that** I can
  check terms before commercial use.

## 3. Feature index

| ID | Feature | Status | Primary screen | Doc |
|---|---|---|---|---|
| F-12-01 | First-run welcome | shipped | Overlay on first launch; Settings → Features overview | [01-first-run-welcome.md](01-first-run-welcome.md) |
| F-12-02 | Guided help | shipped | (?) on Documents, People, TV dialogs | [02-guided-help.md](02-guided-help.md) |
| F-12-03 | AI models & licenses | shipped | Sheet from welcome, Settings, or People help | [03-ai-models-and-licenses.md](03-ai-models-and-licenses.md) |

## 4. Key journeys

| ID | Journey | Path through the product |
|---|---|---|
| J-12-1 | First launch | Install → welcome overlay → close (marked complete) → add a folder |
| J-12-2 | Re-read the intro | Settings → **Features overview** (does not complete first-run if it was not already) |
| J-12-3 | Documents help | Documents → Invoices & Receipts → auto wizard once, then (?) |
| J-12-4 | People / TV help | (?) on the People tabs or Help on TV dialogs |

Step 0 of [J-X1](../JOURNEYS.md) is this module plus [M-13](../13-platform-and-distribution/README.md).

## 5. Entry points & navigation

| Entry point | Leads to | Notes |
|---|---|---|
| First launch (intro not completed) | Welcome modal | Skipped in E2E when `skipAutoProductIntro` is set |
| Settings **Features overview** | Same welcome slides | Preview; closing does not mark complete |
| Documents **Invoices & Receipts** | Feature wizard | Auto once until dismissed |
| People tab (?) | People deck, starting slide depends on tab | Manual only |
| TV broadcast Help | Three TV slides | Manual only |

## 6. Key concepts

| Term | Meaning in this module |
|---|---|
| Welcome wizard | Global first-run deck, title **Welcome to AI Media Library** |
| Guided help | Feature-specific slide deck in the same modal |
| Topic id | `domain:feature` key for dismissal (`documents:invoices-receipts`, `broadcast:tv`) |
| Models sheet | Overlay table of purpose / family / license URL |

## 7. Dependencies

**Depends on**

| Module | What it needs |
|---|---|
| [M-11 Settings & Configuration](../11-settings-and-configuration/README.md) | `guidedExperience` persistence; Settings buttons |
| [M-13 Platform & Distribution](../13-platform-and-distribution/README.md) | Ollama as a separate install; model downloads |

**Depended on by**

| Module | What it consumes |
|---|---|
| [M-07 Documents](../07-documents/README.md) | Invoices auto-help |
| [M-04 People & Faces](../04-people-and-faces/README.md) | People help deck |
| [M-10 Sharing & Presentation](../10-sharing-and-presentation/README.md) | TV help deck |

## 8. Settings owned

| Settings group (UI label) | Features affected |
|---|---|
| `guidedExperience` (not a Settings card) | F-12-01, F-12-02 — intro completed, help-topic dismissal |

Default: `helpTopics: {}` (`DEFAULT_GUIDED_EXPERIENCE_SETTINGS`).

## 9. Quality snapshot

| Type | Coverage |
|---|---|
| E2E | `apps/desktop-media/tests/e2e/product-welcome-first-launch.spec.ts` — welcome visible before a library is added |
| Unit | `product-welcome-content.test.ts`, `guided-slide-catalog.test.ts`, `guided-experience-actions.test.ts` |

**Gaps:** no E2E that Settings preview does *not* persist completion; TV topic id unused for
dismissal; People help has no auto-open tests.

## 10. Known gaps & direction

- `docs/ROADMAP/onboarding-and-guided-help.md` still lists global intro as **Planned**; the
  welcome wizard is **shipped**. Milestone tracking remains planned.
- Upcoming People slides (groups, birth date) exist in the catalog but are flagged off.
