---
id: M-11
title: Settings & Configuration
status: shipped
last_reviewed: 2026-08-26
---

# Module 11 — Settings & Configuration

> One place to see and change how the app behaves — from everyday viewer options to hardware
> and where the catalog lives — without hunting through hidden files.

## 1. Purpose & value

Every other module exposes a few choices (models, thresholds, scan policy, PIN). This module
owns the **Settings** screen those choices live on: how the user opens it, which cards appear,
which ones hide behind **Hide advanced settings**, how **Reset to defaults** is scoped, and
that changes persist across restarts.

It also owns two concerns that are not “someone else’s pipeline”: which GPU the on-device
models should use, and the read-only map of where the database, models, location data and
cache actually sit on disk. The rest of the cards are *hosted* here and *owned* by their
feature — that map is [F-11-02](02-settings-ownership-index.md).

## 2. User stories

- **As any user** I want a Settings section in the sidebar, **so that** I can change behaviour
  without editing a config file.
- **As a non-technical user** I want advanced thresholds hidden until I ask for them,
  **so that** the page is not a wall of numbers.
- **As someone tuning a large library** I want each card to reset on its own,
  **so that** I do not wipe GPU, search and scan choices in one click.
- **As a support-minded user** I want to see where the database and models are,
  **so that** I can back up the right folder.

## 3. Feature index

| ID | Feature | Status | Primary screen | Doc |
|---|---|---|---|---|
| F-11-01 | Settings screen | shipped | Sidebar → Settings | [01-settings-screen.md](01-settings-screen.md) |
| F-11-02 | Settings ownership index | shipped | This catalog (not a user screen) | [02-settings-ownership-index.md](02-settings-ownership-index.md) |
| F-11-03 | GPU & inference | shipped | Settings → **Graphic card usage (GPU)** | [03-gpu-and-inference.md](03-gpu-and-inference.md) |
| F-11-04 | App data locations | shipped | Settings → **Application data files** | [04-app-data-locations.md](04-app-data-locations.md) |

## 4. Key journeys

| ID | Journey | Path through the product |
|---|---|---|
| J-11-1 | Open Settings and change a visible option | Sidebar → Settings → expand a card → toggle → leave; value is kept |
| J-11-2 | Reveal advanced cards | Uncheck **Hide advanced settings** (star-marked checkbox at the top) |
| J-11-3 | Reset one area | Expand a card → **Reset to defaults** (that card only) |
| J-11-4 | Confirm data paths | Unhide advanced → **Application data files** |

Cross-module setup that *uses* Settings (GPS before first scan, analysis model) is in
[`../JOURNEYS.md`](../JOURNEYS.md).

## 5. Entry points & navigation

| Entry point | Leads to | Notes |
|---|---|---|
| Sidebar **Settings** | Full Settings page | Replaces the media workspace; sections start collapsed |
| **Hide advanced settings** | Hides starred cards and fields | Default **on** |
| **Features overview** | Welcome slides (preview) | Does not mark first-run as finished — [F-12-01](../12-onboarding-and-help/01-first-run-welcome.md) |
| **AI models & licenses** | Model/license sheet | [F-12-03](../12-onboarding-and-help/03-ai-models-and-licenses.md) |

## 6. Key concepts

| Term | Meaning in this module |
|---|---|
| Settings | The sidebar section and the page of collapsible cards |
| Hide advanced settings | Page-level switch; default on; advanced cards stay out of the way |
| Reset to defaults | Restores **that card’s** fields only, same label on every card |
| App data location | Where the catalog, settings file, models, GeoNames data and cache live |

## 7. Dependencies

**Depends on**

| Module | What it needs |
|---|---|
| [M-13 Platform & Distribution](../13-platform-and-distribution/README.md) | Installer-chosen data folder; runtime folders for models and cache |

**Depended on by**

| Module | What it consumes |
|---|---|
| Almost every module | Defaults and the Settings UI for its own group — see F-11-02 |

## 8. Settings owned

| Settings group (UI label) | Features affected |
|---|---|
| **Hide advanced settings** (page chrome) | F-11-01 |
| **Graphic card usage (GPU)** | F-11-03 |
| **Application data files** (read-only) | F-11-04 |

All other cards are listed in [F-11-02](02-settings-ownership-index.md).

## 9. Quality snapshot

| Type | Coverage |
|---|---|
| E2E | `apps/desktop-media/tests/e2e/settings.spec.ts` — page opens, file-metadata card, advanced hide, date format |
| E2E | `apps/desktop-media/tests/e2e/photo-analysis-downscale-settings.spec.ts` — analysis downscale defaults and persistence |
| Unit | `apps/desktop-media/src/renderer/lib/apply-persisted-app-settings.test.ts` — disk settings hydrate the store |

**Gaps:** no E2E that every card’s Reset is scoped correctly; GPU adapter detection is Windows-only
and not covered in CI.

## 10. Known gaps & direction

- Changing the database folder from inside the app is not offered (installer-time only).
