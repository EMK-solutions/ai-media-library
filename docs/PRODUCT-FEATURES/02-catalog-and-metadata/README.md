---
id: M-02
title: Catalog & Metadata
status: shipped
last_reviewed: 2026-08-26
---

# Module 02 — Catalog & Metadata

> Read what is really in the user's folders — every file, its dates, its place, its rating — and
> keep that picture correct as the folders change.

## 1. Purpose & value

Adding a folder makes photos visible; the folder scan is what makes them *known*. This module
reads each file in place, pulls the metadata cameras and editors embedded in it, and writes it
into a local catalog: dimensions, capture date, camera and lens, GPS coordinates, star rating,
duration, plus a content fingerprint that lets the app recognise the same file after it is
renamed or moved. Nothing is copied and nothing is written back to the file unless the user
explicitly turns that on.

The catalog is the product's source of truth. Search, people, albums, quick filters, smart
albums and the folder dashboards all read from it, so this module owns the most load-bearing
step of setup — step 2 of the [recommended setup path](../JOURNEYS.md#j-x1--recommended-setup-path-first-library).
Beyond the first pass it keeps the picture honest: later scans detect new, changed, moved and
deleted files, resolve place names from coordinates, infer dates from folder names when the
camera left none, and discard AI results for a file whose pixels actually changed.

## 2. User stories

- **As a new user** I want one action that makes the app actually know my folder,
  **so that** search, faces and filters have something to work with.
- **As an archivist** I want capture dates read from the files themselves,
  **so that** decades of photos sort chronologically instead of by download date.
- **As someone with scanned prints** I want the year in the folder name to count as the date,
  **so that** photos with no EXIF are still placed on a timeline.
- **As a traveller** I want country and city filled in from the coordinates my camera recorded,
  **so that** I can browse by place without tagging anything.
- **As someone who reorganises folders** I want the app to recognise a moved or renamed file,
  **so that** I do not lose its ratings, faces and descriptions.
- **As a cautious owner** I want the app to leave my original files alone by default,
  **so that** using it carries no risk to the only copy I have.
- **As a returning user** I want a re-scan to only look at what changed,
  **so that** keeping a large library current does not mean re-reading everything.

## 3. Feature index

| ID | Feature | Status | Primary screen | Doc |
|---|---|---|---|---|
| F-02-01 | Folder scan & catalog | shipped | Folder ⋮ menu, Background operations dock | [01-folder-scan-and-catalog/](01-folder-scan-and-catalog/README.md) |
| F-02-02 | File identity & change tracking | shipped | Folder tree scan card (Quick folder scan) | [02-file-identity-and-change-tracking.md](02-file-identity-and-change-tracking.md) |
| F-02-03 | Date metadata | shipped | Viewer info panel, list view, date filters | [03-date-metadata.md](03-date-metadata.md) |
| F-02-04 | Location metadata | shipped | Viewer info panel, Geo-location tab, location filters | [04-location-metadata.md](04-location-metadata.md) |
| F-02-05 | Path-based metadata extraction | partial | Settings, folder ⋮ menu | [05-path-based-metadata-extraction.md](05-path-based-metadata-extraction.md) |
| F-02-06 | Embedded metadata write-back | partial | Settings, star rating controls | [06-embedded-metadata-write-back.md](06-embedded-metadata-write-back.md) |
| F-02-07 | AI result invalidation | shipped | No dedicated screen; visible as pipeline coverage dropping | [07-ai-result-invalidation.md](07-ai-result-invalidation.md) |

## 4. Key journeys

| ID | Journey | Path through the product |
|---|---|---|
| J-02-1 | First catalog of a folder | Add library root → **Scan for file changes** with **Include sub-folders** → dock shows phases → catalog populated |
| J-02-2 | Enable place names before the first scan | Settings → **Detect Country / City from GPS coordinates on folder scan** → confirm the location database → run the scan once |
| J-02-3 | Keep a library current | Folder AI analysis summary → **Quick folder scan** counts → folder scan Play → **Only detected changes** |
| J-02-4 | Reorganise folders without losing work | Move or rename files on disk → re-scan the tree → moved files keep their ratings, faces and descriptions |
| J-02-5 | Recover dates for scanned prints | Settings → keep **Extract date(s) from file path** on → scan → folder-name years become event dates |
| J-02-6 | Push a rating back into the file | Settings → **Update file metadata on change of Rating, Title, Description** → rate a photo → the file's XMP rating is updated |

Cross-module flows, including the recommended setup order, are in [`../JOURNEYS.md`](../JOURNEYS.md).

## 5. Entry points & navigation

| Entry point | Leads to | Notes |
|---|---|---|
| Folder row right-click or ⋮ → **Scan for file changes** | A scan of that folder | **Include sub-folders** decides whether the whole tree is read |
| Folder row menu → **Folder AI analysis summary** → folder scan card Play | **Full scan** menu | Two choices: **Only detected changes** or **Full folder tree** |
| Selecting a folder in the tree | Automatic scan of that folder's own files | Only below the auto-scan file limit (default 100), and never while a manual scan is running |
| Adding a library root | Full recursive scan of the new root | Controlled by a setting, on by default |
| Starting any AI pipeline | Per-file cataloging just before the AI step | So a pipeline never runs against an unknown file |
| Settings → **Folder scanning, file metadata and Geo-location** | All of this module's settings | Includes the GPS location database download |
| Folder row menu → **Extract path metadata (LLM)** | Optional AI reading of folder and file names | Only visible when the LLM path setting is enabled |
| Background operations dock | Live scan progress, phase, counts, **Cancel scan** | Also hosts the location database download card |

## 6. Key concepts

| Term | Meaning in this module |
|---|---|
| Catalog | The local record of everything read from the user's files |
| Folder scan | Reading files to create or update their catalog entries; **Scan for file changes** in the UI |
| Full scan | Reads every file in scope, changed or not |
| Incremental scan | Reads only the files a quick scan flagged as new, changed or moved |
| Quick scan | Compares the folder tree against the catalog and reports counts, without reading file contents |
| Scan freshness | How long ago the folders in a tree were scanned; drives the outdated highlight |
| Capture date | When the camera says the photo was taken |
| Event date | The date the app browses and filters by, resolved from capture date, folder names or file time |
| Date precision | Whether a date is known to the year, month, day or exact instant |
| Location source | Which source a place name came from: coordinates, embedded text, folder names or image content |
| Write-back | Mirroring a rating the user changed in the app into the original file |
| Invalidation | Discarding AI results because the file's content or geometry changed |

Full definitions: [`../GLOSSARY.md`](../GLOSSARY.md).

## 7. Dependencies

**Depends on**

| Module | What it needs |
|---|---|
| [M-01 Library Browsing & Media Viewer](../01-library-browsing-and-media-viewer/README.md) | Library roots and the folder tree define what there is to scan, and where scans are started from |
| [M-09 Background Processing](../09-background-processing/README.md) | Runs scans, geocoding and path extraction as queued jobs, and reports their progress |
| [M-11 Settings & Configuration](../11-settings-and-configuration/README.md) | Hosts the **Folder scanning, file metadata and Geo-location** settings section |
| [M-13 Platform & Distribution](../13-platform-and-distribution/README.md) | Where the catalog database and the downloaded location database live |

**Depended on by**

| Module | What it consumes |
|---|---|
| [M-01 Library Browsing & Media Viewer](../01-library-browsing-and-media-viewer/README.md) | Dates, places, dimensions, camera data and ratings shown in the grid, list and info panel |
| [M-03 AI Image Analysis](../03-ai-image-analysis/README.md) | Catalog rows to analyse, and invalidation when a file changes |
| [M-04 People & Faces](../04-people-and-faces/README.md) | Catalog rows to detect faces in; detections are dropped when a file changes |
| [M-05 Search & Discovery](../05-search-and-discovery/README.md) | Date, location and rating filters, and the rows the search index is built over |
| [M-06 Albums](../06-albums/README.md) | Event dates and places that smart albums are derived from |
| [M-08 Insights & Library Health](../08-insights-and-library-health/README.md) | Scan freshness, quick scan counts, content hashes for duplicate detection, failed-file lists |

## 8. Settings owned

| Settings group (UI label) | Features affected |
|---|---|
| **Folder scanning, file metadata and Geo-location** — path date extraction, GPS location detection, scan-outdated threshold, empty-folder summary, scan on new library root, embedded metadata write-back, LLM path extraction and its models, auto-scan file limit, quick scan move matching | F-02-01, F-02-02, F-02-03, F-02-04, F-02-05, F-02-06 |

The section is rendered by `apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx`;
shipped defaults live in `apps/desktop-media/src/shared/ipc.ts`
(`DEFAULT_FOLDER_SCANNING_SETTINGS`, `DEFAULT_PATH_EXTRACTION_SETTINGS`). Four of the controls are
marked advanced and are hidden while **Hide advanced settings** is on (the default).

## 9. Quality snapshot

| Type | Coverage |
|---|---|
| E2E | `apps/desktop-media/tests/e2e/metadata-scan-manual-continuation.spec.ts` — a manual scan survives changing folder selection, and folder-selection auto-scan is skipped while it runs |
| E2E | `apps/desktop-media/tests/e2e/metadata-scan-file-churn.spec.ts` — cross-folder move, deletion, same-folder duplicate and rename are each reported correctly |
| E2E | `apps/desktop-media/tests/e2e/metadata-scan-edited-file-reset.spec.ts` — replacing a file with a different one under the same name refreshes its catalog metadata |
| E2E | `apps/desktop-media/tests/e2e/geolocation-metadata-scan.spec.ts` — only images with coordinates are geocoded, and a repeat scan reports zero location updates |
| E2E | `apps/desktop-media/tests/e2e/geocoder-download.spec.ts` — confirming the download enables the GPS setting and initialises in the dock; a cached copy is reused instead |
| E2E | `apps/desktop-media/tests/e2e/geo-location-folder-ai-summary.spec.ts` — the Geo-location card's Play completes with GPS fixtures, with no GPS images, and on a partially scanned tree |
| Unit / integration | `apps/desktop-media/electron/db/observe-files-move.integration.test.ts`, `.../media-ai-invalidation-guards.test.ts`, `.../media-item-geocoding.test.ts`, `.../media-item-star-rating-update.test.ts`, `apps/desktop-media/electron/geocoder/reverse-geocoder.test.ts`, `apps/desktop-media/electron/ipc/auto-metadata-scan-policy.test.ts`, `apps/desktop-media/electron/lib/folder-tree-quick-scan-moves.test.ts`, `.../folder-tree-quick-scan-coverage.test.ts`, `.../embedded-write-path-key.test.ts`, `apps/desktop-media/electron/path-extraction/date-extractor.test.ts`, `.../title-extractor.test.ts`, `.../event-date-resolver.test.ts`, `.../llm-path-analyzer.test.ts` |

**Gaps:** the EXIF/XMP reading path itself is exercised only indirectly through E2E scans, there
is no automated coverage of the four-phase progress reporting, and the grace-period purge of
long-deleted catalog entries has no test.

## 10. Known gaps & direction

- Nothing in the product tells a user that the folder scan is the prerequisite for everything
  else; the ordering only exists in documentation and in the recommended setup path.
- Write-back is limited to the star rating even though the setting is worded as covering rating,
  title and description.
- There is no undo for a scan, and no way to review what a scan changed after its dock card is
  gone.
- The GPS location database is an all-or-nothing download of roughly 2 GB; there is no
  country-scoped or online-lookup alternative.
- LLM path extraction is a manual, folder-at-a-time action rather than part of the scan, and it
  is hidden behind advanced settings.
