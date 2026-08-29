---
id: F-13-02
module: 13-platform-and-distribution
title: Auto-update
status: partial
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/electron/app-updater.ts
  - apps/desktop-media/electron/application-menu.ts
  - apps/desktop-media/electron/build-app-menu-template.ts
  - apps/desktop-media/electron-builder.yml
related:
  - F-13-01
---

# Auto-update

> On an installed build, check GitHub Releases for a newer version, download it in the
> background, and let Help → Check for Updates… do the same on demand.

## 1. Summary

Packaged Windows and Linux builds use **electron-updater** against GitHub Releases
(`EMK-solutions/ai-media-library`), with `latest.yml` / `latest-linux.yml` published beside
the installers. Shortly after startup the app calls `checkForUpdatesAndNotify()` (download
automatically). **Help → Check for Updates…** runs a check; in a **dev** (unpackaged) session
that menu item opens the Releases page in a browser instead of installing anything.

The main process emits `available` / `downloaded` / `error` events to the renderer, but the
renderer does **not** subscribe — there is no Settings row, toast, or restart button in the
UI. Installing a downloaded update uses `quitAndInstall` from IPC, which the UI never calls
today; the user relies on electron-updater’s notify flow or a later manual install.

## 2. User stories

- **As someone on a packaged install** I want updates without hunting GitHub,
  **so that** bug fixes arrive.
- **As a developer running from source** I want Check for Updates to open Releases,
  **so that** I am not told an Electron cache is “the app”.
- This is **not** a Settings toggle (there is no “check daily” checkbox).

## 3. Scope

**In scope**

- Startup check + auto-download on packaged builds
- Help menu item
- Dev fallback to the browser
- IPC surface even where the UI is incomplete

**Out of scope**

- In-app changelog
- Optional update channels / skip-this-version UI

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Where to download the first installer | [Windows installer](01-windows-installer.md), `docs/END-USER-GUIDE/install.md` |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-13-02.1 | Startup check (packaged) | `checkForUpdatesAndNotify` | shipped |
| F-13-02.2 | Help → Check for Updates… | Manual check or open Releases | shipped |
| F-13-02.3 | In-app update banner / restart | Renderer listening to `app:update-ui-event` | planned (IPC ready, UI absent) |

## 5. User journeys

### J-13-02-1 — Packaged app finds an update

**Trigger:** launched installed build.
**Preconditions:** network; a newer GitHub Release with update metadata.

1. Shortly after start, electron-updater checks the feed.
2. If an update exists it downloads (`autoDownload: true`).
3. The OS/updater notify path may prompt; the app window has no dedicated banner.

**Outcome:** user can restart into the new version if the updater completes that flow.

**Failure paths**

- Check throws → `error` event is broadcast; nothing visible in the renderer today.
- No network → check fails the same way.

### J-13-02-2 — Check from the menu

**Trigger:** **Help → Check for Updates…**

- Packaged: `autoUpdater.checkForUpdates()`.
- Not packaged: opens `https://github.com/EMK-solutions/ai-media-library/releases/latest`.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Help menu | Application menu | Documentation, License, Check for Updates… | `build-app-menu-template.ts` |

**States**

| State | What the user sees |
|---|---|
| Dev build + menu | Browser on Releases |
| Packaged + update | Updater/OS notify (not an in-app card) |
| Packaged + no update | No UI |

**UX notes**

- `docs/limitations-and-transparency.md` says “No in-app update announcement yet” — true for
  the **window**, not for the updater existing.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Updater configuration and startup check run only when `app.isPackaged`. | Dev must not overwrite itself from GitHub. | `app-updater.ts` |
| BR-2 | `autoDownload` is true for packaged builds. | Updates arrive without a second click. | same |
| BR-3 | Unpackaged `app:check-for-updates` opens the latest Releases URL and returns a message that updates apply to installed builds only. | Honest fallback. | same |
| BR-4 | Unpackaged `quitAndInstall` is a no-op. | Avoid quitting dev for a missing payload. | same |
| BR-5 | Publish provider is GitHub (`owner: EMK-solutions`, `repo: ai-media-library`). | Same feed as human downloads. | `electron-builder.yml` |

## 8. Settings & defaults

None — this feature exposes no user settings.

## 9. Data & persistence

electron-updater keeps its own cache under the OS app-data area (not `media-settings.json`).
The catalog is not involved.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| GitHub Releases + `latest.yml` / `latest-linux.yml` | Finding a build | Check fails; Help still opens Releases in dev |
| Network | Check/download | Error event, no in-app copy |
| Matching artifact for the OS | Install | Linux needs linux metadata; Windows needs NSIS + `latest.yml` |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `app:check-for-updates` | — | Check or open Releases |
| `app:quit-and-install-update` | — | Restart into downloaded update (packaged) |
| `app:get-version` | — | `app.getVersion()` (preload `getAppVersion`; unused in renderer today) |
| `app:update-ui-event` | `available` / `downloaded` / `error` | Intended UI; no subscriber |

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| — | none dedicated | Menu template can be unit-tested via `build-app-menu-template` if a test exists |

**Coverage gaps:** no Playwright for updates (would need a packaged app and a fake feed).

## 13. Known limitations & open questions

- **Limitation:** no in-app restart prompt; IPC for quit-and-install is unused by React.
- **Limitation:** `getAppVersion` is exposed but not shown in Settings.
- **Open question:** whether a toast should appear on `downloaded` (the event already exists).

## 14. References

- Module: [Platform & Distribution](README.md)
- `docs/limitations-and-transparency.md`
- `docs/END-USER-GUIDE/install.md`
