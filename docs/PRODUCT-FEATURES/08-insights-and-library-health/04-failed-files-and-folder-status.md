---
id: F-08-04
module: 08-insights-and-library-health
title: Failed files & folder status
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/DesktopFolderAiFailedList.tsx
  - apps/desktop-media/electron/ipc/folder-ai-summary-handlers.ts
  - apps/desktop-media/src/renderer/lib/photo-pending-folder-tint.ts
  - apps/desktop-media/src/renderer/components/SidebarTree.tsx
  - apps/desktop-media/electron/db/folder-ai-coverage.ts
related:
  - F-08-01
  - F-01-01
  - F-03-01
  - F-09-02
---

# Failed files & folder status

> See which files a pipeline could not process, and read folder health from the coloured squares
> in the sidebar without opening the dashboard.

## 1. Summary

When image analysis, face detection or search indexing records a failure newer than any later
success, the dashboard and Subfolders table show a failed count. Clicking it opens **Folder AI
failed files**: thumbnail, name, path, resolution and the error text. The list is for inspection;
retry means running the pipeline again from the dashboard or folder menu.

Separately, every folder row carries a small square (or spinner) for **subtree** coverage of
face detection, AI search index and image analysis. When faces and search are done but image
analysis is not, the square uses **Image analysis pending — folder icon** (default amber) so a
long analysis backlog does not paint the whole tree urgent red.

## 2. User stories

- **As someone whose analysis stopped on a handful of files** I want those files named,
  **so that** I can open them on disk or skip them.
- **As a browsing user** I want the folder tree to show remaining AI work, **so that** I know
  where to run the next pipeline.
- **As someone with a large library still waiting on image analysis** I want that waiting state
  to look less urgent than "nothing has run", **so that** red stays meaningful.

## 3. Scope

**In scope**

- Failed-files list for photo, face and search-index pipelines
- Sidebar rollup squares, including the pending-analysis tint
- Analysis-strip mini-card borders that follow the same tint when only image analysis is left

**Out of scope**

- Dashboard cards and Play — [Folder AI analysis dashboard](01-folder-ai-analysis-dashboard/README.md)
- Scan-card "files to add/update" (catalog freshness, not pipeline failure)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Folder tree structure | [Library roots & folder tree](../01-library-browsing-and-media-viewer/01-library-roots-and-folder-tree.md) |
| Why a pipeline failed | The module that ran it (M-03, M-04, M-05) |
| Dock error lines on a running job | [Progress dock](../09-background-processing/02-progress-dock.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-08-04.1 | Failed-files list | Per-pipeline, per-folder (recursive flag from the cell) | shipped |
| F-08-04.2 | Sidebar rollup | Green / amber / red / grey / pending-analysis tint | shipped |
| F-08-04.3 | In-progress spinner | Folder square becomes a spinner while a job is in progress for that folder | shipped |
| F-08-04.4 | Pending-analysis tint setting | Red, Amber (default) or Green | shipped |

## 5. User journeys

### J-08-04-1 — Open failed files

**Trigger:** the user clicks a failed count in the dashboard or Subfolders AI table.
**Preconditions:** that pipeline has `failedCount` > 0.

1. The summary header becomes **Folder AI failed files**; a subtitle names the pipeline and
   folder.
2. Rows list each still-failed file. Broken thumbnails hide themselves.
3. **Back to summary** returns to the dashboard.

**Outcome:** the user knows which paths failed and the stored error.

**Alternate paths**

- Empty after a race with a retry → **No failed files found for this selection.**

**Failure paths**

- Load error → **Could not load failed files list.**

### J-08-04-2 — Read the tree at a glance

**Trigger:** the user looks at Folders in the sidebar.
**Preconditions:** rollups have loaded for visible rows.

1. Grey square: no indexed images in the subtree.
2. Red: at least one of face, search index or image analysis is not started for the subtree.
3. Amber: mixed / partial completion.
4. Green: all three complete.
5. Tinted square (setting): faces and search complete, image analysis not — default amber.
6. Spinner: a pipeline is in progress for that folder, or rollup still loading (grey spinner).

**Outcome:** the user picks a folder that still needs work.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Failed list | Failed count control | Thumb, name, path, resolution, error | `apps/desktop-media/src/renderer/components/DesktopFolderAiFailedList.tsx` |
| Failed count cell | Subfolders table | **Failed: n**; tooltip **Failed: typically corrupt file** | `apps/desktop-media/src/renderer/components/DesktopFolderAiPipelineStatusCell.tsx` |
| Folder row square | Folders sidebar | Square or spinner; tooltip names the rollup | `apps/desktop-media/src/renderer/components/SidebarTree.tsx` |
| Tint setting | Settings → AI image analysis | Three colour swatches | `apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx` |
| Analysis strip borders | Folder media header | Mini-cards; photo card uses tint when face+search done | `apps/desktop-media/src/renderer/components/DesktopFolderAiPipelineStrip.tsx` |

**States**

| State | What the user sees |
|---|---|
| List loading | Centre spinner |
| Missing resolution | **Resolution: -** |
| Tint Green | Sidebar square uses the same success green as fully complete; the photo mini-card border goes *neutral*, not green, so "ignore pending analysis" does not look like success on the card |

**UX notes** — Sidebar rollup is subtree-wide. The Analysis strip is direct images only. Failed
counts are *not* shown on the sidebar squares.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | A photo/face failure is listed only if `failed_at` is set and is newer than or equal to any success timestamp (or there is no success). | A later successful retry must drop the file from the list. | `folder-ai-summary-handlers.ts` |
| BR-2 | Search-index failures are embedding rows with status `failed` for the current vision model. | Indexing lives on embeddings, not `photo_analysis_failed_at`. | Same |
| BR-3 | `photo_analysis_waiting` when face and search labels are `done` and photo is not. | Image analysis is expected to lag; it gets its own icon state. | `apps/desktop-media/electron/db/folder-ai-coverage.ts` |
| BR-4 | Default pending-analysis tint is amber. | Red would make every unanalysed folder look broken. | `DEFAULT_PHOTO_ANALYSIS_SETTINGS.folderIconWhenPhotoAnalysisPending` |
| BR-5 | Tint `green` on the photo mini-card means "do not emphasise pending analysis" (neutral border), never a success outline. | Green-as-complete is reserved for actually done. | `photo-pending-folder-tint.ts`, `pipeline-mini-card-border.ts` |
| BR-6 | Native tooltip on failed counts: typically a corrupt file. | Sets expectation without opening the list. | `UI_TEXT.folderAiSummaryStatusFailedCorrupt` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| Image analysis pending — folder icon | Amber (moderate) | Sidebar square (and photo mini-card border) when only image analysis is left | No |
| Red (urgent) / Green (same as fully complete) | — | Alternatives on the same control | No |

`apps/desktop-media/src/shared/ipc.ts`. Green on the sidebar square *does* use the success colour;
see BR-5 for the mini-card exception.

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| `photo_analysis_failed_at` / `_error` | `media_items` | Image analysis failures |
| Face failure columns | `media_items` | Face detection failures |
| Embedding `last_error` / `failed` | `media_embeddings` | Search index failures |
| Tint preference | Photo analysis settings | Survives restart |

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Catalog failure timestamps | List rows | Empty list |
| File readable at path | Thumbnail | Image hidden, text remains |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `media:get-folder-ai-failed-files` | `folderPath`, pipeline (`photo` / `face` / semantic), recursive | Load the list |
| `media:get-folder-ai-rollups-batch` | folder paths | Sidebar squares |

No retry action — re-run the pipeline via F-08-01 or folder menus.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| Unit | `apps/desktop-media/electron/db/folder-ai-coverage.test.ts` | `photo_analysis_waiting` vs done/partial |
| Unit | `apps/desktop-media/src/renderer/lib/photo-pending-folder-tint.test.ts` | Square and border classes |
| Unit | `apps/desktop-media/src/renderer/lib/pipeline-mini-card-border.test.ts` | Tint green clears urgency on the photo card |
| E2E | `apps/desktop-media/tests/e2e/folder-ai-summary.spec.ts` | Dashboard including failed-adjacent coverage |

**Coverage gaps:** failed-files list has no dedicated E2E; catalog-change amber outline from older
UX notes is not implemented on `SidebarTree.tsx`.

## 13. Known limitations & open questions

- **Limitation:** the list has no Retry, Show in Explorer, or open-in-viewer control.
- **Limitation:** sidebar squares ignore per-pipeline failed counts (dashboard only).
- **Contradiction with older docs:** `FOLDER-ANALYTICS-MENU-UX.md` §7.2 describes an amber
  outline on folders after a scan created/updated rows (`foldersWithCatalogChanges`). Current
  code uses `foldersTouched` only to refresh an open dashboard, not to outline rows.
- **Open question:** whether scan-failed files (metadata scan `filesFailed`) should appear on
  this list; today they do not — only AI pipeline failures.

## 14. References

- Module: [Insights & Library Health](README.md)
- [Folder AI analysis dashboard](01-folder-ai-analysis-dashboard/README.md)
- [Library roots & folder tree](../01-library-browsing-and-media-viewer/01-library-roots-and-folder-tree.md)
