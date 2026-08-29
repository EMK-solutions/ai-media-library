---
id: F-02-01
module: 02-catalog-and-metadata
title: Folder scan & catalog
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/electron/ipc/metadata-scan-handlers.ts
  - apps/desktop-media/electron/db/media-item-metadata.ts
  - apps/desktop-media/src/shared/ipc.ts
  - packages/media-store/src/slices/metadata-scan.ts
  - packages/media-metadata-core/src/storage/
related:
  - F-02-02
  - F-02-03
  - F-02-04
  - F-02-05
  - F-02-07
---

# Folder scan & catalog

> Read every photo and video in a folder, record what the files themselves say about them, and
> keep that record in step with the folder as it changes.

## 1. Summary

The folder scan is the single action that turns "the app can show me this folder" into "the app
knows this folder". It walks the files, reads the metadata that cameras, phones and editing
software embedded in them, and writes it into the local catalog: pixel dimensions, orientation,
capture date, camera and lens, exposure settings, GPS coordinates, star rating, embedded title
and description, and video duration. It also records a fingerprint of each file so the same photo
can be recognised after a rename or a move.

Everything else in the product reads that catalog. Search filters, people, albums, smart albums,
the quick filters above the grid and the folder dashboards are all projections of it, which is
why the scan is step 2 of the
[recommended setup path](../../JOURNEYS.md#j-x1--recommended-setup-path-first-library) and why
nothing downstream behaves properly before it has run once.

A scan can cover one folder or a whole tree, and it can read everything or only what a quick scan
flagged as changed. It runs in the background with a progress card in the Background operations
dock, survives the user navigating elsewhere, and can be cancelled at any point without leaving
the catalog inconsistent — a cancelled scan simply did less. The app never modifies the files it
reads; writing anything back is a separate, off-by-default feature
([Embedded metadata write-back](../06-embedded-metadata-write-back.md)).

## 2. User stories

- **As a new user** I want one obvious action that makes the app understand my folder,
  **so that** the rest of the product has something to work with.
- **As an archivist** I want the dates and camera details that are already inside my files,
  **so that** I do not re-enter information the files already carry.
- **As someone with a large library** I want to scan a tree once and then only re-read what
  changed, **so that** staying current is measured in seconds rather than hours.
- **As a cautious owner** I want to be sure a scan only reads,
  **so that** my originals are never at risk.
- **As an impatient user** I want to keep browsing while a scan runs, and stop it if I change my
  mind, **so that** the app never feels like it has locked me out.

This is not a photo importer. It does not copy, move, rename or convert anything, and it does not
create a separate library folder.

## 3. Scope

**In scope**

- Discovering photo and video files in a folder, optionally through the whole subtree
- Reading embedded metadata from images (EXIF and XMP) and from video containers
- Creating and updating catalog entries, and marking entries whose files have disappeared
- The four scan phases and how they are reported to the user
- The choice between reading everything and reading only detected changes
- The automatic scans: on folder selection, on adding a library root, and before an AI pipeline
- Cancelling a scan, and what a cancelled scan leaves behind

**Out of scope**

- How a moved, renamed or duplicated file is matched to its existing entry — see
  [File identity & change tracking](../02-file-identity-and-change-tracking.md)
- Which date wins when several sources disagree — see [Date metadata](../03-date-metadata.md)
- Turning coordinates into country and city — see [Location metadata](../04-location-metadata.md)
- Reading dates and places out of folder names — see
  [Path-based metadata extraction](../05-path-based-metadata-extraction.md)
- Deciding when AI results must be thrown away — see
  [AI result invalidation](../07-ai-result-invalidation.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Adding and removing library roots, and the folder tree itself | [Library roots & folder tree](../../01-library-browsing-and-media-viewer/01-library-roots-and-folder-tree.md) |
| Thumbnails appearing before any scan has run | [Folder media browsing](../../01-library-browsing-and-media-viewer/02-folder-media-browsing.md) |
| The dock that shows scan progress, and job queueing | [Background Processing](../../09-background-processing/README.md) |
| The folder dashboard that reports scan freshness and coverage | [Insights & Library Health](../../08-insights-and-library-health/README.md) |
| Duplicate review built on the content fingerprints a scan records | [Insights & Library Health](../../08-insights-and-library-health/README.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-02-01.1 | Manual folder scan | **Scan for file changes** on any folder row, with an **Include sub-folders** choice | shipped |
| F-02-01.2 | Full vs changes-only scan | A **Full scan** menu on the folder scan card offering **Only detected changes** or **Full folder tree** | shipped |
| F-02-01.3 | Embedded metadata reading | Dimensions, capture date, camera, lens, exposure, coordinates, rating, title, description and video duration taken from the files | shipped |
| F-02-01.4 | Phased progress reporting | A dock card naming the current step out of three or four, with counts and a cancel control | shipped |
| F-02-01.5 | Automatic scan on folder selection | Small folders refresh themselves when opened, without the user asking | shipped |
| F-02-01.6 | Automatic scan on new library root | A newly added root is catalogued end to end without a second action | shipped |
| F-02-01.7 | Cataloging ahead of AI pipelines | Starting face detection, image analysis or search indexing on an unscanned folder still works | shipped |
| F-02-01.8 | Missing-file reconciliation | Files deleted from disk stop appearing, and come back if the file returns | shipped |
| F-02-01.9 | Cancellation | **Cancel scan** stops the run immediately and keeps what was already read | shipped |

## 5. User journeys

Six journeys are documented in full in [journeys.md](journeys.md):

| ID | Journey |
|---|---|
| J-02-01-1 | First scan of a new folder tree |
| J-02-01-2 | Re-scanning only what changed |
| J-02-01-3 | Opening a small folder and letting it refresh itself |
| J-02-01-4 | Cancelling a scan that is taking too long |
| J-02-01-5 | Scanning a folder that contains unreadable files |
| J-02-01-6 | Starting an AI pipeline on a folder that was never scanned |

## 6. Screens & UX

The scan has no screen of its own. It is started from folder menus and reported in the
Background operations dock, whose phase titles, counts, cancel behaviour and quiet-completion
rules are described in [ux-screens.md](ux-screens.md).

## 7. Business rules

Fourteen rules govern what a scan reads, what it skips, what it counts and what it leaves behind.
They are listed with their code locations in [business-rules.md](business-rules.md). The three
that most change what a user sees:

- A file whose size, modification time and metadata version all match its catalog entry is
  reported as unchanged and not re-read.
- A scan that changes nothing removes its own progress card, so routine no-op scans stay quiet.
- Reconciliation of missing files only runs when the preparation phase covered every folder in
  scope, so a cancelled scan can never mass-delete catalog entries.

## 8. Settings & defaults

Five settings change how and when scans run; they are tabulated with their effects in
[configuration.md](configuration.md). In summary: a full recursive scan starts automatically
after a library root is added (on), folders under 100 files refresh themselves on selection
(advanced), folder scans are flagged as outdated after 30 days, GPS place-name resolution adds a
fourth phase (off), and date extraction from file paths runs inside the scan (on).

## 9. Data & persistence

What a scan writes, and what each field means to the user, is in
[configuration.md](configuration.md#data--persistence). The short version: one catalog entry per
file path, holding the file's own facts plus a metadata version stamp; a per-folder record of
when that folder was last scanned; and a file-identity record per file used for move detection
and duplicate grouping. All of it lives in the local database and survives restarts. Removing a
library root does not delete the files, and deleting a file from disk marks its entry rather than
erasing it immediately.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Read access to the files on disk | Everything | Affected files are counted as failed; the scan continues |
| ExifTool, bundled with the app | Video metadata, and rating write-back | Videos are catalogued with a metadata error and no capture date |
| The location database, when GPS detection is on | Filling in country, state and city | The geocoding phase is skipped and place names stay empty; the scan still completes |
| A local Ollama model, only for LLM path extraction | Reading dates and places out of messy folder names | The optional path-extraction action reports that no suitable model was found |
| The background job queue | Running scans and reporting them | Scans cannot be started |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `media:scan-folder-metadata` | `folderPath`, `recursive`, `scanScope` (`full` or `incremental`) | Start a scan and return its job id and file total |
| `media:cancel-metadata-scan` | `jobId` | Stop the running scan |
| `media:metadata-scan-progress` | Event stream | Job started, phase updated, item updated, job completed |
| `media:get-media-items-by-paths` | `paths` | Read catalog entries for specific files |
| `media:media-item-metadata-refreshed` | Event stream | Push a refreshed entry to the open window |
| `media:purge-deleted-media-items` | — | Permanently remove entries deleted longer than the grace period |
| `media:purge-soft-deleted-media-items-by-ids` | `mediaItemIds` | Permanently remove specific already-deleted entries |
| `metadata-scan` pipeline | Folder scope | The same scan run as a queued job, so it can be bundled with others |
| `path-rule-extraction`, `geocoder-init`, `gps-geocode` pipelines | Folder scope, or explicit item ids | Re-run the post-scan steps on their own |
| `path-and-geo`, `path-rule-only`, `geo-only` presets | `folderPath`, `recursive` | Re-run path rules and geocoding without a full scan |

Channel names are defined in `apps/desktop-media/src/shared/ipc.ts`; pipeline and preset ids in
`apps/desktop-media/electron/pipelines/`.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/metadata-scan-manual-continuation.spec.ts` | A manually started scan keeps running when the user selects another folder, and folder-selection auto-scan is skipped while it runs |
| E2E | `apps/desktop-media/tests/e2e/metadata-scan-file-churn.spec.ts` | A cross-folder move is not reported as missing on disk; a deletion is; a same-folder duplicate and a rename introduce no missing-on-disk regression |
| E2E | `apps/desktop-media/tests/e2e/metadata-scan-edited-file-reset.spec.ts` | Replacing a file with different content under the same name refreshes its catalog metadata on the next scan |
| E2E | `apps/desktop-media/tests/e2e/geolocation-metadata-scan.spec.ts` | The geocoding phase runs only for images with coordinates, and a repeat scan reports zero location updates |
| Unit | `apps/desktop-media/electron/ipc/auto-metadata-scan-policy.test.ts` | The auto-scan decision: skipped for folders that only contain subfolders, skipped while a manual scan runs, skipped at or above the file limit, run below it |
| Integration | `apps/desktop-media/electron/db/observe-files-move.integration.test.ts` | A file moved between folders is not marked deleted when the source folder is prepared before the destination |

**Coverage gaps:** the phase sequence and the three-versus-four step count have no automated
coverage; failed-file reporting and cancellation mid-phase are not covered by E2E; the
grace-period purge of long-deleted entries is untested.

## 13. Known limitations & open questions

- **Limitation:** the product never tells the user that the scan must run before search, faces
  and filters will work. The dependency is real but undocumented in the UI.
- **Limitation:** a scan cannot be undone, and once its progress card is gone there is no record
  of which files it created or changed. The completed job reports counts, not a reviewable list.
- **Limitation:** the automatic scan on folder selection covers only the folder's own files, never
  its subfolders, so opening a parent folder never refreshes the tree beneath it.
- **Limitation:** progress during the first phase is reported per file rather than by folder, so a
  very large tree can sit on "Checking files on disk" for a long time with little visible
  movement. Recorded as a known delay in `docs/ARCHITECTURE/MEDIA-METADATA-SCAN-PROGRESS-DELAY.md`.
- **Limitation:** files larger than 128 MiB get no content fingerprint, which weakens move
  detection and duplicate grouping for large videos.
- **Open question:** whether a completed scan should offer to run the AI pipelines it made
  necessary. The scan already counts the files that need follow-up and reports them per folder,
  but nothing in the UI consumes those counts today.

## 14. References

- Module: [Catalog & Metadata](../README.md)
- [File identity & change tracking](../02-file-identity-and-change-tracking.md) — how a file is
  recognised across renames and moves
- [Date metadata](../03-date-metadata.md), [Location metadata](../04-location-metadata.md) — what
  the scan does with what it reads
- [AI result invalidation](../07-ai-result-invalidation.md) — the consequence of a file having
  really changed
- Detail: [journeys.md](journeys.md), [business-rules.md](business-rules.md),
  [ux-screens.md](ux-screens.md), [configuration.md](configuration.md)
- Architecture: `docs/ARCHITECTURE/MEDIA-METADATA-SCAN-PROGRESS-DELAY.md`
- Implementation history: `docs/IMPLEMENTATION-LOG/features/2026-04_desktop_xmp_metadata_418c7a92.plan.md`,
  `docs/IMPLEMENTATION-LOG/features/2026-03_file_identity_dedup_deletion_718497b7.plan.md`
