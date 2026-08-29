---
id: M-08
title: Insights & Library Health
status: shipped
last_reviewed: 2026-08-26
---

# Module 08 — Insights & Library Health

> See how far a folder has been processed, find duplicate copies, fix photos stored the wrong way
> up, and look at files that failed a pipeline.

## 1. Purpose & value

Once the catalog exists, the user still needs a place that answers "how is this library doing?"
rather than "what is in this folder?". This module is that place. The folder AI analysis dashboard
shows coverage for scanning, search indexing, face detection, image analysis, rotation checks and
place names. Duplicate files and wrongly rotated images are review lists the user can act on.
Failed files and the coloured squares on folder rows make incomplete or broken work visible without
opening every pipeline.

Nothing here replaces browsing. The Insights sidebar is a dedicated section; the same dashboard
also opens from a folder row so the user can stay inside Folders when they are already looking at
a tree. Background jobs started from these screens are queued and reported by
[Background Processing](../09-background-processing/README.md), so the user can keep browsing
while a scan or check runs.

## 2. User stories

- **As a library owner** I want a single dashboard for a folder tree, **so that** I can see what
  is done and start the next pipeline without hunting through menus.
- **As someone with copies scattered across disks** I want to find identical files and delete the
  extras, **so that** I keep one copy without guessing.
- **As someone with scanned pages** I want a list of photos the app believes are sideways,
  **so that** I can rotate them in one pass.
- **As someone whose analysis failed on a few files** I want to see which files and why,
  **so that** I can retry or skip them.
- **As a browsing user** I want folder icons that show remaining work, **so that** I do not have
  to open the dashboard for every folder.

## 3. Feature index

| ID | Feature | Status | Primary screen | Doc |
|---|---|---|---|---|
| F-08-01 | Folder AI analysis dashboard | shipped | Folders / Insights → Folder analysis status | [01-folder-ai-analysis-dashboard/README.md](01-folder-ai-analysis-dashboard/README.md) |
| F-08-02 | Duplicate files | shipped | Insights → Duplicate files; folder row → Check duplicate files | [02-duplicate-files/README.md](02-duplicate-files/README.md) |
| F-08-03 | Wrongly rotated images review | shipped | Insights → Wrongly rotated images; dashboard **View wrongly rotated images** | [03-wrongly-rotated-images-review.md](03-wrongly-rotated-images-review.md) |
| F-08-04 | Failed files & folder status | shipped | Failed-files list; sidebar folder squares | [04-failed-files-and-folder-status.md](04-failed-files-and-folder-status.md) |

## 4. Key journeys

| ID | Journey | Path through the product |
|---|---|---|
| J-08-1 | Check a folder tree's readiness | Folder ⋮ → **Folder AI analysis summary** → Summary cards → play a pipeline |
| J-08-2 | Tidy copies | Insights → **Duplicate files** → pick a library if asked → review **By folder** / **By file** → mark and delete |
| J-08-3 | Fix sideways photos | Insights → **Wrongly rotated images** (or the dashboard link) → **Save** or **Discard** |
| J-08-4 | Inspect failures | Dashboard or Subfolders table → failed count → **Folder AI failed files** list |

Cross-module flows, including cleanup after the first scan (J-X4) and the recommended setup
path, are in [`../JOURNEYS.md`](../JOURNEYS.md).

## 5. Entry points & navigation

| Entry point | Leads to | Notes |
|---|---|---|
| Sidebar **Insights** | Three child rows | Order is Folder analysis status, Wrongly rotated images, Duplicate files |
| **Folder analysis status** | Library pick hub, or the dashboard for the only root | Same dashboard as the folder-row action |
| **Wrongly rotated images** | Library pick hub, or the review list | Toggle **Include subfolders** on the review screen |
| **Duplicate files** | Library pick hub, or a scan of the only root | Folder-row **Check duplicate files** skips the hub |
| Folder row ⋮ → **Folder AI analysis summary** | Dashboard for that folder | Does not start a scan by itself |
| Folder row ⋮ → **Check duplicate files** | Duplicate scan for that folder | Accordion: **Include sub-folders** (default on) |
| Empty folder with children | Dashboard (optional) | Setting **On empty folder selection show AI analysis status summary for subfolders** (default on) |
| Media-grid **Analysis** strip | Dashboard for the selected folder | Direct-images-only mini-cards; not a substitute for the dashboard |

The Insights hub is a grid of library-root cards when more than one root is added. With no
roots, it tells the user to add folders and run a full scan first.

## 6. Key concepts

| Term | Meaning in this module |
|---|---|
| Folder analysis dashboard | Coverage cards and tables for one folder or folder tree |
| Coverage | Share of images a pipeline has finished, with failed counts shown separately |
| Duplicate files | Catalog files that share a content hash, or a weaker name/size/date match |
| Wrongly rotated image | An image the orientation check flagged; the user applies or discards the turn |
| Failed file | An item whose latest pipeline attempt failed and has not been superseded by a later success |
| Folder status square | Sidebar icon for subtree AI coverage (green / amber / red / grey, or a tinted square when only image analysis is left) |

Full definitions: [`../GLOSSARY.md`](../GLOSSARY.md).

## 7. Dependencies

**Depends on**

| Module | What it needs |
|---|---|
| [M-01 Library Browsing & Media Viewer](../01-library-browsing-and-media-viewer/README.md) | Folder selection, the folder tree, and the viewer for opening originals |
| [M-02 Catalog & Metadata](../02-catalog-and-metadata/README.md) | Scan freshness, GPS coverage, content hashes, file identity |
| [M-03 AI Image Analysis](../03-ai-image-analysis/README.md) | Image-analysis coverage, rotation findings, failed analysis |
| [M-04 People & Faces](../04-people-and-faces/README.md) | Face-detection coverage and the Face detection details tab |
| [M-05 Search & Discovery](../05-search-and-discovery/README.md) | AI search index coverage |
| [M-09 Background Processing](../09-background-processing/README.md) | Queueing scans, pipelines, duplicate checks and deletions |
| [M-11 Settings & Configuration](../11-settings-and-configuration/README.md) | Empty-folder auto-open, scan-outdated days, pending-analysis icon tint, rotation confidence |

**Depended on by**

| Module | What it consumes |
|---|---|
| [M-12 Onboarding & Help](../12-onboarding-and-help/README.md) | Dashboard info slides and the recommended tidy-up step |
| [M-01 Library Browsing & Media Viewer](../01-library-browsing-and-media-viewer/README.md) | Folder-row status squares and the Analysis strip |

[M-06 Albums](../06-albums/README.md), [M-07 Documents](../07-documents/README.md),
[M-10 Sharing & Presentation](../10-sharing-and-presentation/README.md) and
[M-13 Platform & Distribution](../13-platform-and-distribution/README.md) do not consume this
module directly.

## 8. Settings owned

| Settings group (UI label) | Features affected |
|---|---|
| **On empty folder selection show AI analysis status summary for subfolders** | F-08-01 |
| **Automatically show this summary on empty folder selection** (checkbox on the dashboard) | F-08-01 — same setting |
| **Image analysis pending — folder icon** (Red / Amber / Green; default Amber) | F-08-04 |

Scan-outdated days, GPS detection, rotation confidence and pipeline concurrency are owned by
M-02, M-03, M-09 and M-11 but change what this module shows.

## 9. Quality snapshot

| Type | Coverage |
|---|---|
| E2E | `apps/desktop-media/tests/e2e/insights-section.spec.ts` — Insights sub-nav order; hub vs auto-open for one or two library roots |
| E2E | `apps/desktop-media/tests/e2e/folder-ai-summary.spec.ts` — dashboard scan card, pipeline play, rotation progress, review from the card |
| E2E | `apps/desktop-media/tests/e2e/geo-location-folder-ai-summary.spec.ts` — Geo-location card after a scan |
| E2E | `apps/desktop-media/tests/e2e/duplicate-files-pipeline-cancel.spec.ts` — cancel vs dismiss on the duplicate-scan dock card |
| Unit | Folder-ai-summary cards/formatters, duplicate-files aggregators, rotation-review geometry/metadata, folder-icon tint |

**Gaps:** failed-files list has no E2E; deleting duplicates is covered mainly by unit tests of
aggregates and pipeline definitions, not a full UI deletion journey.

## 10. Known gaps & direction

- Older UX notes describe an amber outline on folders whose catalog was just updated; the
  current sidebar only uses the coverage squares (see F-08-04).
- The failed-files list is read-only; retry means re-running the pipeline from the dashboard or
  folder menu.
- Applying a rotation rewrites the original file on disk — the one Insights action that is not
  catalog-only.
