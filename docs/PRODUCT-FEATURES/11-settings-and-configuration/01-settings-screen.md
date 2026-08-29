---
id: F-11-01
module: 11-settings-and-configuration
title: Settings screen
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx
  - apps/desktop-media/src/renderer/lib/apply-persisted-app-settings.ts
  - apps/desktop-media/electron/storage.ts
  - apps/desktop-media/src/shared/ipc.ts
related:
  - F-11-02
  - F-11-03
  - F-11-04
  - F-12-01
  - F-12-03
---

# Settings screen

> Open one scrollable page of collapsible cards, change a setting, and have it stick after
> restart — with advanced cards hidden until you uncheck that option.

## 1. Summary

Settings is a sidebar section, not a dialog. Choosing it replaces the main pane with a long
page of `<details>` cards that all start **collapsed**. Everyday cards (viewer, TV broadcast,
albums, folder scanning, AI image search, AI image analysis) stay visible. A checkbox
**Hide advanced settings** (default **on**) hides GPU, rotation detection, face detection,
face recognition, pipeline concurrency, application data paths, and a number of extra fields
inside the everyday cards.

Each card that has editable fields ends with **Reset to defaults**, which restores that card
only. Changes are written to `media-settings.json` in the app data folder and reapplied on
startup.

## 2. User stories

- **As a browsing user** I want viewer and date-format options without opening advanced GPU
  lists, **so that** Settings stays usable.
- **As someone who made a mess of thresholds** I want to reset one card, **so that** the rest
  of my choices stay put.
- **As a returning user** I want last session’s Settings to load before help wizards auto-open,
  **so that** dismissal flags and models are already known.

## 3. Scope

**In scope**

- Navigation to Settings, page layout, collapse/expand, hide-advanced, per-card reset
- Persistence, sanitisation of out-of-range values, hydration into the desktop store
- Page chrome: Features overview, AI models & licenses (those flows are owned by M-12)

**Out of scope**

- The meaning of each pipeline threshold — owned by the feature in F-11-02
- Choosing the data folder — [Windows installer](../13-platform-and-distribution/01-windows-installer.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Which feature owns which card | [Settings ownership index](02-settings-ownership-index.md) |
| GPU adapter list | [GPU & inference](03-gpu-and-inference.md) |
| Path display | [App data locations](04-app-data-locations.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-11-01.1 | Settings workspace | Sidebar item; scrollable card list | shipped |
| F-11-01.2 | Hide advanced settings | Default on; starred advanced cards/fields hidden | shipped |
| F-11-01.3 | Per-card reset | **Reset to defaults** scoped to that section | shipped |
| F-11-01.4 | Persistence | Survives restart; invalid values clamped | shipped |

## 5. User journeys

### J-11-01-1 — Change a setting

**Trigger:** sidebar **Settings**.
**Preconditions:** none.

1. The page title **Settings** appears; cards are collapsed.
2. The user expands **Image / Video viewer** and changes date format.
3. They switch back to Folders. The new format is already in use.

**Outcome:** the choice is in `media-settings.json` and the store.

**Failure paths**

- A number outside the allowed range is not kept; the field shows a validation error.

### J-11-01-2 — Show advanced cards

**Trigger:** **Hide advanced settings** is checked (the default).

1. The user unchecks it.
2. Cards such as **Graphic card usage (GPU)** and **Face detection** appear (still collapsed).
3. Rechecking hides them again without resetting their values.

### J-11-01-3 — Reset one card

**Trigger:** **Reset to defaults** on an expanded card.

1. Only that card’s fields return to shipped defaults.
2. Other cards are untouched.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Settings page | Sidebar **Settings** | Title, hide-advanced, Features overview, AI models & licenses, section cards | `apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx` |
| Pipeline concurrency card | Advanced visible | GPU / Ollama / CPU / I/O limits | `apps/desktop-media/src/renderer/components/PipelineConcurrencySettings.tsx` |

**States**

| State | What the user sees |
|---|---|
| Just opened | All cards collapsed; hide-advanced on |
| Advanced hidden | Starred cards and fields not shown |
| Paths unavailable | **Application data files** shows “Not available” per row |

**UX notes**

- Numeric rows use a **?** to reveal Why/How copy (`SettingsNumberField` in `@emk/media-viewer`).
- **Reset to defaults** is the same label on every card (one translation key).
- Shared field chrome: `packages/media-viewer/src/settings-controls.tsx`.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | **Hide advanced settings** defaults to on. | Most users should not see detector thresholds on day one. | `apps/desktop-media/src/shared/ipc.ts` (`hideAdvancedSettings: true`) |
| BR-2 | Settings cards start collapsed each time the page is opened. | A long page of open cards is unreadable on a small window. | `packages/media-viewer` `SettingsSectionCard` |
| BR-3 | **Reset to defaults** on a card restores only that card’s fields. | Accidental full-app reset would be destructive. | Per-card handlers in `DesktopSettingsSection.tsx` / desktop slice |
| BR-4 | On read, missing or invalid keys are filled or clamped; new fields get shipped defaults. | Older `media-settings.json` files must keep working. | `apps/desktop-media/electron/storage.ts` |
| BR-5 | Renderer changes are saved through `media:save-settings`; a successful save is pushed to every window so the store cannot drift from disk. | Two windows (or a race with hydration) must not overwrite each other with stale state. | `apps/desktop-media/electron/ipc/fs-handlers.ts`, `apply-persisted-app-settings.ts` |
| BR-6 | Help wizards wait until persisted settings have been applied (`persistedSettingsHydrated`). | Auto-open must not run against empty dismissal flags. | `apps/desktop-media/src/renderer/lib/apply-persisted-app-settings.ts` |
| BR-7 | Previewing the welcome deck from **Features overview** does not mark first-run complete. | Support and curiosity should not skip onboarding. | `DesktopSettingsSection.tsx` (button title / `productWelcomePreviewOpen`) |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| Hide advanced settings | On | Hides advanced cards and fields | No (this *is* the switch) |

Other groups: [F-11-02](02-settings-ownership-index.md).

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| All `AppSettings` | `<userData>/media-settings.json` | Survives restart; not inside the photo folders |
| In-memory mirror | Desktop Zustand store | What the UI edits; hydrated from disk on launch |

`userData` can be the installer-chosen folder; see [F-11-04](04-app-data-locations.md).

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Writable userData | Saving | Settings revert after restart (logged in main) |
| `media:get-settings` / `media:save-settings` | Load/save | Page shows store defaults until IPC succeeds |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `media:get-settings` | — | Read sanitised `AppSettings` |
| `media:save-settings` | full `AppSettings` | Persist and broadcast `settingsSaved` |
| Store setters / per-section resets | field key + value | What the UI calls; persisted by the settings subscription |

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/settings.spec.ts` | Opens Settings; file-metadata labels; LLM path field hidden while advanced hidden; date format options |
| E2E | `apps/desktop-media/tests/e2e/photo-analysis-downscale-settings.spec.ts` | Downscale default on / 1024 px; unchecking persist through analysis request |
| Unit | `apps/desktop-media/src/renderer/lib/apply-persisted-app-settings.test.ts` | Hydration of a folder-scanning flag |

**Coverage gaps:** hide-advanced persistence itself; per-card reset; multi-window save race.

## 13. Known limitations & open questions

- **Limitation:** there is no “reset all Settings”.
- **Open question:** whether **Application data files** should stay advanced-only, given
  supportability.

## 14. References

- Module: [Settings & Configuration](README.md)
- [Settings ownership index](02-settings-ownership-index.md)
