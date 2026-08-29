---
id: F-13-01
module: 13-platform-and-distribution
title: Windows installer
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/electron-builder.yml
  - apps/desktop-media/electron/install-config.ts
  - apps/desktop-media/electron/app-paths.ts
related:
  - F-11-04
  - F-13-03
---

# Windows installer

> Install AI Media Library on Windows with a choice of program folder and a separate folder
> for the catalog and settings.

## 1. Summary

The Windows artifact is an NSIS installer named
`AI Media Library-<version>-Windows-x64.exe` (`electron-builder.yml`). The wizard is not
one-click: the user can change the install directory and is prompted for an **Application
data folder (database, settings)** used as Electron `userData`. That choice is remembered for
the next install. After setup, Settings → **Application data files** shows the resolved paths;
models and cache stay under the runtime root, not necessarily next to the database.

Linux AppImage and `.deb` builds are produced (`dist:linux`) and covered in
`docs/END-USER-GUIDE/install.md`. There is no equivalent documented data-folder wizard for
Linux; this feature document is Windows installer UX.

## 2. User stories

- **As a Windows user with a small system drive** I want the database on another disk,
  **so that** a large catalog does not fill C:.
- **As someone reinstalling** I want the last data folder proposed again,
  **so that** I do not create a second empty library by accident.
- This is **not** an in-app migrate tool.

## 3. Scope

**In scope**

- NSIS flow: app location, data folder, post-install path split
- How the running app reads the persisted data path
- What is explicitly not in this phase (in-app path change, profiles)

**Out of scope**

- Auto-update after install — [Auto-update](02-auto-update.md)
- Linux packaging UX beyond “packages exist”

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Showing paths in the app | [App data locations](../11-settings-and-configuration/04-app-data-locations.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-13-01.1 | App install directory | Standard NSIS location picker | shipped |
| F-13-01.2 | Data folder prompt | `userData` for DB + settings | shipped |
| F-13-01.3 | Remembered data path | Next install proposes the last folder | shipped |
| F-13-01.4 | Linux artifacts | AppImage + deb from the same builder config | shipped (no NSIS-like UX doc) |

## 5. User journeys

### J-13-01-1 — Install on Windows

**Trigger:** user runs the NSIS exe from GitHub Releases.
**Preconditions:** 64-bit Windows.

1. Wizard asks for the application install directory.
2. Prompt: **Application data folder (database, settings)**.
3. Install completes; launching the app uses that folder as `userData`.
4. Database file is `desktop-media.db` in that folder.

**Outcome:** app runs against the chosen catalog location.

**Alternate paths**

- No prior config → Electron default userData after install if the prompt is skipped/defaulted
  (exact default folder is the NSIS script’s; the app then reads ini/txt/env as in BR-2).

**Failure paths**

- Unwritable data folder → app cannot create the database (main-process error; no fancy UI).

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| NSIS wizard | Downloaded `.exe` | Install dir, data folder prompt | `apps/desktop-media/electron-builder.yml` + `build-resources/installer-user-data.nsh` |
| Application data files | In-app Settings (advanced) | Read-only paths | [F-11-04](../11-settings-and-configuration/04-app-data-locations.md) |

**States**

| State | What the user sees |
|---|---|
| Fresh install | Prompt for data folder |
| Reinstall | Last selected data folder proposed (installer remembers) |

**UX notes**

- `oneClick: false`, `allowToChangeInstallationDirectory: true`, per-user (`perMachine: false`).
- Uninstall does **not** delete app data (`deleteAppDataOnUninstall: false`).
- Builds are unsigned locally (`signAndEditExecutable: false`).

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Artifact name is `${productName}-${version}-Windows-${arch}.exe` with productName **AI Media Library**. | Matches Releases and the end-user install guide. | `electron-builder.yml` |
| BR-2 | At startup, `userData` resolution order is env `EMK_DESKTOP_USER_DATA_PATH`, then `install-config.ini` `[Paths] UserDataPath` (dir **AI Media Library**, then legacy **EMK Desktop Media**), then `install-user-data-path.txt` in those dirs, then Electron default. | Tests, new branding, and old installs. | `install-config.ts` |
| BR-3 | Runtime models/cache/GeoNames do **not** follow the installer data folder; they use appData **AI Media Library** (or `EMK_DESKTOP_RUNTIME_ROOT_PATH`). | Keep backups of the catalog folder smaller. | `app-paths.ts` |
| BR-4 | No in-app change of DB path and no multi-profile switch in this phase. | Avoid copying a live SQLite file. | installer UX non-goals |

## 8. Settings & defaults

None in the Settings page. Installer defaults are NSIS/script defaults (app dir + data dir).

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Chosen userData | `%APPDATA%/AI Media Library/install-config.ini` (legacy txt and **EMK Desktop Media** still read) | Next launch and next install |
| Catalog | `<userData>/desktop-media.db` | The library |
| Settings JSON | `<userData>/media-settings.json` | All Settings cards |

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Writable data folder | Database | App fails to start catalog features |
| GitHub Releases | Finding the exe | User cannot install from the documented channel |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `media:get-database-location` | — | Confirm what the installer/env resolved |

Env overrides: `EMK_DESKTOP_USER_DATA_PATH`, `EMK_DESKTOP_RUNTIME_ROOT_PATH`.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| Unit | `apps/desktop-media/electron/install-config.test.ts` | Env, ini, legacy txt, missing file |
| Unit | `apps/desktop-media/electron/app-paths.test.ts` | Runtime vs legacy folder names |

**Coverage gaps:** **no dedicated installer E2E**; NSIS UI is not automated.

## 13. Known limitations & open questions

- **Limitation:** older installer copy used the name **EMK Desktop Media**; the shipped builder
  and `install.md` use **AI Media Library**.
- **Limitation:** Linux has packages but not this data-folder wizard.
- **Open question:** in-app migrate/open-folder buttons (listed as future in installer UX).

## 14. References

- Module: [Platform & Distribution](README.md)
- `docs/END-USER-GUIDE/install.md`
- Linux build notes: `docs/desktop-wsl-linux-build.md`
