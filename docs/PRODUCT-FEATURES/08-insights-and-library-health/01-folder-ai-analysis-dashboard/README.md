---
id: F-08-01
module: 08-insights-and-library-health
title: Folder AI analysis dashboard
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/DesktopFolderAiSummaryView.tsx
  - apps/desktop-media/src/renderer/components/folder-ai-summary/
  - apps/desktop-media/electron/ipc/folder-ai-summary-handlers.ts
  - apps/desktop-media/src/renderer/hooks/use-folder-ai-summary-pipeline-actions.ts
related:
  - F-08-03
  - F-08-04
  - F-02-01
  - F-03-01
  - F-03-03
  - F-09-01
---

# Folder AI analysis dashboard

> Open a folder or folder tree and see, at a glance, what has been scanned and which AI
> pipelines still need to run — then start the next one from the same screen.

## 1. Summary

The dashboard answers "is this folder ready?" before the user has to read a table. Image and
video counts appear first; scan freshness, geo-location, AI search index, face detection, image
analysis and wrongly rotated images each have their own card, which stays on a spinner until
*that* card's data arrives so the user never sees a misleading zero. Play controls enqueue the
matching job in Background operations and always cover the folder **and its sub-folders**, in
**missing only** mode.

Tabs keep the detail: **Subfolders** (AI pipelines plus a nested quick-scan table), **Face
detection** statistics, and **Geo-location**. Insights → **Folder analysis status** and the
folder-row **Folder AI analysis summary** action open the same view. Opening it is read-only
until the user presses Play — it does not start a scan by itself.

## 2. User stories

- **As a library owner** I want coverage for a whole tree on one screen, **so that** I know
  which pipeline to run next.
- **As someone setting up a new folder** I want to start scan, index, faces or analysis from
  the cards, **so that** I do not have to remember which menu holds each action.
- **As a user with nested event folders** I want a subfolder table, **so that** I can drill into
  the child that is behind.
- **As someone who opened an empty parent folder** I want the tree summary instead of an empty
  grid, **so that** I still see what is underneath.

This is not a photo browser. Thumbnails stay on the grid; this view replaces that pane until
**Back to images**.

## 3. Scope

**In scope**

- Dashboard cards, progressive loading, Refresh and Close
- Play on scan, geo-location, search index, faces, image analysis and rotation
- Tabs: Summary, Subfolders, Face detection, Geo-location
- Auto-open on empty folder selection
- Insights library pick hub for **Folder analysis status**

**Out of scope**

- Applying or dismissing a rotation — [Wrongly rotated images review](../03-wrongly-rotated-images-review.md)
- The failed-files list and sidebar squares — [Failed files & folder status](../04-failed-files-and-folder-status.md)
- How each pipeline does its work — M-02, M-03, M-04, M-05

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Folder scan phases and incremental vs full | [Folder scan & catalog](../02-catalog-and-metadata/01-folder-scan-and-catalog/README.md) |
| Queue, dock, cancel | [Background Processing](../09-background-processing/README.md) |
| Rotation detection (the check itself) | [Wrong rotation detection](../03-ai-image-analysis/03-wrong-rotation-detection.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-08-01.1 | Summary cards | Counts, scan freshness, geo, four image-pipeline cards | shipped |
| F-08-01.2 | Progressive load | Each card group paints when its data is ready | shipped |
| F-08-01.3 | Run from a card | Play enqueues the job for the folder tree, missing-only | shipped |
| F-08-01.4 | Subfolders tables | Per-child AI coverage and a nested quick-scan table | shipped |
| F-08-01.5 | Face detection tab | Faces found/tagged, suggested matches, people per image | shipped |
| F-08-01.6 | Geo-location tab | GPS coverage, extracted place names, path-LLM location | shipped |
| F-08-01.7 | Empty-folder auto-open | Optional jump to the tree summary | shipped |
| F-08-01.8 | Insights hub | Pick a library root when more than one exists | shipped |

## 5. User journeys

Five journeys are in [journeys.md](journeys.md): first look at a tree (J-08-01-1), start a
pipeline from a card (J-08-01-2), run geo-location and download the place database
(J-08-01-3), open from Insights (J-08-01-4), land on the summary from an empty parent folder
(J-08-01-5).

## 6. Screens & UX

Header, cards, tabs, loading rules and the geo download dialog are in
[ux-screens.md](ux-screens.md). The important chrome: title is **Folder tree analysis summary**
when the folder has immediate children, otherwise **Folder analysis summary**; Close is labelled
**Back to images**.

## 7. Business rules

Card loading, scan-card colours, recursive Play, and "already queued" behaviour are in
[business-rules.md](business-rules.md). Defaults that change the dashboard live in
[configuration.md](configuration.md).

## 8. Settings & defaults

See [configuration.md](configuration.md). The setting this feature owns is **On empty folder
selection show AI analysis status summary for subfolders** (default on), also offered as
**Automatically show this summary on empty folder selection** on the dashboard itself.

## 9. Data & persistence

The dashboard stores nothing of its own. It reads catalog coverage and scan timestamps. Card
visibility defaults are all on in code and are not a user setting today.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Catalog from [M-02](../02-catalog-and-metadata/README.md) | Counts and coverage | Empty or not-done cards |
| [M-09](../09-background-processing/README.md) | Play actually running | Play fails or the job never appears in the dock |
| Ollama / face models / orientation model | The pipelines the cards start | Dock error on that job; coverage stays incomplete |
| GeoNames download (~2 GB) | Reverse geocoding from the geo card | Confirm dialog, then a download card in the dock |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `media:get-folder-ai-summary-overview` | `folderPath`, include-subfolder flags | Image/video counts and scan freshness |
| `media:get-folder-tree-scan-summary` | `folderPath`, outdated-after days | Scan card / quick-scan breakdown |
| `media:get-folder-ai-coverage` | `folderPath`, recursive | Pipeline and geo coverage |
| Streamed table IPC | folder path | Subfolders / face / geo detail rows |
| `enqueueFolderAiPipeline` | `photo` / `face` / `semantic` / `rotation`, always recursive, missing-only from the dashboard | Queue the card's pipeline |
| Geo play | `geo-only` preset | Geocoder init then reverse geocode |

Defined in `apps/desktop-media/electron/ipc/folder-ai-summary-handlers.ts` and
`apps/desktop-media/src/renderer/lib/enqueue-folder-ai-pipeline.ts`.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/folder-ai-summary.spec.ts` | Tree scan card after a full scan; play disabled while a job runs; enqueue; rotation progress; open review |
| E2E | `apps/desktop-media/tests/e2e/geo-location-folder-ai-summary.spec.ts` | Geo card after scan; play omitted when nothing has GPS |
| E2E | `apps/desktop-media/tests/e2e/insights-section.spec.ts` | Insights → Folder analysis status hub vs auto-open |
| Unit | `apps/desktop-media/src/renderer/components/folder-ai-summary/*.test.*` | Card status, scan-card colours, glyphs |
| Unit | `apps/desktop-media/src/renderer/lib/folder-ai-summary-formatters.test.ts`, `folder-ai-summary-scan-refresh.test.ts` | Percents; refresh after scan/pipeline |
| Unit | `apps/desktop-media/electron/ipc/folder-ai-summary-handlers.test.ts` | Handler contracts |

**Coverage gaps:** Face detection and Geo-location detail tabs have little E2E; auto-open on
empty folder selection is not covered by the Insights spec.

## 13. Known limitations & open questions

- **Limitation:** Play from a card always includes sub-folders and does not offer Override
  existing; that choice still lives on the folder-row AI menus.
- **Limitation:** A second Play for a pipeline already queued for an overlapping folder is
  ignored (`duplicate-active-job`) without a dialog — the card shows running/queued instead.
- **Limitation:** `PipelineBlockedDialog` ("cancel or wait") exists in code but is not wired to
  this screen.
- **Open question:** older PRDs named the second tab **Details: AI pipelines**; the shipped
  label is **Subfolders**.

## 14. References

- Module: [Insights & Library Health](../README.md)
- Detail: [journeys.md](journeys.md), [ux-screens.md](ux-screens.md),
  [business-rules.md](business-rules.md), [configuration.md](configuration.md)
