---
id: M-13
title: Platform & Distribution
status: shipped
last_reviewed: 2026-08-26
---

# Module 13 — Platform & Distribution

> Install the desktop app, keep it current, attach local AI runtimes, and be explicit that
> photos are not uploaded to a vendor cloud.

## 1. Purpose & value

Everything the user sees in Folders and Settings still has to arrive as an installer, find a
place on disk for the catalog, download on-device models, and optionally talk to **Ollama** on
the same machine. This module owns that delivery surface: the **Windows NSIS installer**
(data-folder prompt), **auto-update** from GitHub Releases, **local AI runtime** (Ollama +
ONNX/Hugging Face weights + GeoNames), and the **privacy / offline stance** the product
promises.

Linux packages (AppImage and `.deb`) exist and are documented for end users, but the
installer *UX* documents and the in-app data-folder wizard are **Windows-focused**.

## 2. User stories

- **As a Windows user** I want to choose where the database lives at install time,
  **so that** the catalog can sit on a large drive.
- **As someone who already installed** I want Help → Check for Updates and a silent download
  on packaged builds, **so that** I am not stuck on a beta forever.
- **As a privacy-conscious user** I want analysis to run on this PC,
  **so that** using AI does not mean opening a cloud photo account.

## 3. Feature index

| ID | Feature | Status | Primary screen | Doc |
|---|---|---|---|---|
| F-13-01 | Windows installer | shipped | NSIS wizard | [01-windows-installer.md](01-windows-installer.md) |
| F-13-02 | Auto-update | partial | Help → Check for Updates… | [02-auto-update.md](02-auto-update.md) |
| F-13-03 | Local AI runtime | shipped | First-run downloads; Ollama separately | [03-local-ai-runtime.md](03-local-ai-runtime.md) |
| F-13-04 | Privacy & offline stance | shipped | Welcome privacy slide; product behaviour | [04-privacy-and-offline.md](04-privacy-and-offline.md) |

## 4. Key journeys

| ID | Journey | Path through the product |
|---|---|---|
| J-13-1 | Install on Windows | Download NSIS exe → app folder → data folder → launch |
| J-13-2 | First AI-ready session | Welcome → models download in Background operations → install Ollama if analysis is needed |
| J-13-3 | Update a packaged build | Startup check and/or Help → Check for Updates… |

[J-X1](../JOURNEYS.md) step 0 is install + welcome + models.

## 5. Entry points & navigation

| Entry point | Leads to | Notes |
|---|---|---|
| GitHub Releases | Installers | Product name **AI Media Library** |
| NSIS wizard | App + `userData` path | Windows |
| Help menu | Documentation, License, Check for Updates… | `application-menu.ts` |
| Background operations | Face/aux model download progress | [M-09](../09-background-processing/README.md) |

## 6. Key concepts

| Term | Meaning in this module |
|---|---|
| Packaged build | Installed NSIS / AppImage / deb, not `pnpm dev` |
| userData | Catalog + `media-settings.json` |
| Runtime root | Models, GeoNames, cache (not necessarily the same as userData) |
| Ollama | Separate local HTTP service, default `http://127.0.0.1:11434` |

## 7. Dependencies

**Depends on**

| Module | What it needs |
|---|---|
| [M-11 Settings & Configuration](../11-settings-and-configuration/README.md) | Path display; GPU preference |
| [M-12 Onboarding & Help](../12-onboarding-and-help/README.md) | Welcome, models sheet |

**Depended on by**

| Module | What it consumes |
|---|---|
| M-03, M-04, M-05 | Ollama and/or ONNX models must be present for those pipelines |

## 8. Settings owned

None on the Settings page. Update and Ollama address are not user-facing settings (Ollama URL
is env-only).

## 9. Quality snapshot

| Type | Coverage |
|---|---|
| Unit | `install-config.test.ts`, `app-paths.test.ts` |
| E2E | `face-model-download-failure.spec.ts` — download failure in Background operations |

**Gaps:** no dedicated installer E2E; auto-update untested in Playwright (packaged-only).

## 10. Known gaps & direction

- In-app update *banner* is not wired; electron-updater notify + Help menu are.
- `docs/limitations-and-transparency.md` still says there is no in-app update announcement —
  partly true for renderer UI, stale if read as “no updater at all”.
- Linux install is real; Linux installer UX is not specified like Windows NSIS.
