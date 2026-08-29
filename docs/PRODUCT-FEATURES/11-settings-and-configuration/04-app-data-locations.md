---
id: F-11-04
module: 11-settings-and-configuration
title: App data locations
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx
  - apps/desktop-media/electron/ipc/fs-handlers.ts
  - apps/desktop-media/electron/app-paths.ts
  - apps/desktop-media/electron/install-config.ts
related:
  - F-11-01
  - F-13-01
  - F-02-04
---

# App data locations

> See, in Settings, which folders hold the catalog, AI models, location database and disposable
> cache — without being able to move them from this screen.

## 1. Summary

**Application data files** is a read-only advanced card. It answers “where did the app put my
library database?” and “where are the downloaded models?”. The catalog and `media-settings.json`
live under the **database folder** (Electron `userData`, which the Windows installer may have
redirected). Models, GeoNames place data and cache live under a separate **runtime** root so a
backup of the database folder does not have to include multi-gigabyte downloads.

There is no in-app “move database” action. Changing the catalog folder is an installer-time
choice; see [Windows installer](../13-platform-and-distribution/01-windows-installer.md).

## 2. User stories

- **As someone backing up the library** I want the database file path written out,
  **so that** I copy the right folder and not the whole user profile.
- **As a user who enabled GPS place names** I want to see the Geo-location folder,
  **so that** a ~2 GB download is not a mystery.
- This is **not** a file manager; paths cannot be edited here.

## 3. Scope

**In scope**

- Read-only display of database folder, database file, AI models folder, GeoNames folder, cache
- How those paths are resolved (installer `userData` vs runtime root)

**Out of scope**

- Creating or migrating the database
- Downloading GeoNames (owned by location metadata) or ONNX models (face / search)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Installer prompt for data folder | [Windows installer](../13-platform-and-distribution/01-windows-installer.md) |
| GPS download confirm (~2 GB) | [Location metadata](../02-catalog-and-metadata/04-location-metadata.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-11-04.1 | Path list | Five labelled, copyable-looking paths | shipped |
| F-11-04.2 | Split roots | Catalog/settings vs models/cache/GeoNames | shipped |

## 5. User journeys

### J-11-04-1 — Find the database file

**Trigger:** user needs to back up or send a path to support.
**Preconditions:** **Hide advanced settings** is off.

1. Settings → expand **Application data files**.
2. Read **Database folder** and **Database file** (filename is always `desktop-media.db`
   inside that folder).

**Outcome:** the user knows the catalog location.

**Failure paths**

- IPC has not returned yet → each row shows **Not available**.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Application data files | Settings, advanced shown | Five path blocks | `DesktopSettingsSection.tsx` |

**States**

| State | What the user sees |
|---|---|
| Loaded | Absolute paths in monospace |
| Missing | **Not available** |

**UX notes**

- Labels: **Database folder**, **Database file**, **AI models folder**, **Geo-location database
  folder (GPS coordinates decoding to country, area, city)**, **Disposable cache folder
  (sessions and other non-model cache)**.
- No “Open folder” button in the current build.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | The catalog file is always `desktop-media.db` inside `userData`. | One predictable file for backup. | `apps/desktop-media/electron/ipc/fs-handlers.ts` |
| BR-2 | `userData` is: env `EMK_DESKTOP_USER_DATA_PATH`, else installer `install-config.ini` / legacy txt (folder **AI Media Library**, then legacy **EMK Desktop Media**), else Electron’s default userData. | Tests and custom installs must be deterministic; old installs keep working. | `apps/desktop-media/electron/install-config.ts` |
| BR-3 | Models, Hugging Face cache, GeoNames and disposable cache use a runtime root under appData **`AI Media Library`** (overridable with `EMK_DESKTOP_RUNTIME_ROOT_PATH`), not the installer-selected DB folder. | A relocated database should not orphan multi-GB caches; backups of `userData` stay small. | `apps/desktop-media/electron/app-paths.ts` |
| BR-4 | The card is advanced (hidden while **Hide advanced settings** is on). | Paths are support-oriented. | `DesktopSettingsSection.tsx` |
| BR-5 | Paths are display-only; the UI cannot change them. | Avoid corrupting an open SQLite file. | same |

## 8. Settings & defaults

None — this feature exposes no user settings.

Typical Windows layout when nothing was customised:

| Label | Typical location |
|---|---|
| Database folder | Electron userData for **AI Media Library** |
| Database file | `<database folder>/desktop-media.db` |
| AI models folder | `%APPDATA%/AI Media Library/ai-models` |
| Geo-location database folder | `%APPDATA%/AI Media Library/geonames` |
| Disposable cache | `%APPDATA%/AI Media Library/cache` |

First GPS enable still downloads about **2 GB** into the GeoNames folder (copy in Settings GPS
confirm). That download is not started from this card.

## 9. Data & persistence

The card stores nothing. It reads `media:get-database-location`.

| Data | Where | User-visible meaning |
|---|---|---|
| Catalog + settings JSON | `userData` | What to back up for “the library” |
| ONNX / Hugging Face weights | `ai-models/` | Re-downloadable; not the catalog |
| GeoNames cache | `geonames/` | Place-name lookup; large |
| Session and other cache | `cache/` | Safe to delete if the app is closed |

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| `media:get-database-location` | Filling the card | **Not available** |
| Installer / default userData | A real database folder | App still runs; path is the default |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `media:get-database-location` | — | Return `userDataPath`, `dbPath`, `modelsPath`, `geonamesPath`, `cachePath`, plus ONNX/HF subpaths |

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| Unit | `apps/desktop-media/electron/app-paths.test.ts` | Runtime root, models, GeoNames, cache, env override |
| Unit | `apps/desktop-media/electron/install-config.test.ts` | Env, ini, legacy txt, missing config |

**Coverage gaps:** no E2E that the Settings card shows the same paths as IPC.

## 13. Known limitations & open questions

- **Limitation:** no in-app relocate/migrate wizard (called out in installer docs as a
  non-goal for this phase).
- **Limitation:** installer business-logic notes still mention `%APPDATA%\EMK Desktop Media\`
  as the primary folder; code prefers **AI Media Library** and treats the old name as legacy.
- **Open question:** a one-click “open database folder” control is listed as a future UX
  extension in installer docs, not implemented.

## 14. References

- Module: [Settings & Configuration](README.md)
- [Windows installer](../13-platform-and-distribution/01-windows-installer.md)
