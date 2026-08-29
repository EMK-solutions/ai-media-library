---
id: F-08-02
module: 08-insights-and-library-health
title: Duplicate files
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/duplicate-files/
  - apps/desktop-media/src/renderer/actions/duplicate-files-actions.ts
  - apps/desktop-media/electron/db/folder-duplicate-scan.ts
  - apps/desktop-media/electron/pipelines/definitions/folder-duplicate-scan.ts
  - apps/desktop-media/electron/pipelines/definitions/duplicate-marked-files-delete.ts
related:
  - F-02-02
  - F-08-01
  - F-09-01
---

# Duplicate files

> Find files whose contents match (or probably match), review them by folder or by file, and
> delete the copies you do not need.

## 1. Summary

Duplicate detection compares catalogued photos and videos. When a content hash is available, two
paths with the same hash are treated as the same file even if they live in different folders or
have different names. Files that still have no hash can appear as **probable** duplicates when
file name, byte size and modification time all match.

The user starts a check from Insights → **Duplicate files** (whole library root) or from a
folder row → **Check duplicate files** (that folder, optionally with sub-folders). Results open
in a dedicated workspace: **By folder** first, then **By file** for marking. Deletion is a
separate Background operations job and asks whether to use Recycle Bin / Trash (default on).
Similar-image search is a different feature; opening one closes the other.

## 2. User stories

- **As someone with the same shoot copied into two folders** I want matching files listed
  together, **so that** I can keep one tree and delete the other.
- **As a cautious owner** I want to mark copies myself and confirm counts and size before
  anything is removed, **so that** I do not delete the original by accident.
- **As someone with huge videos** I want to know when a match is only name, size and date,
  **so that** I do not treat it as proof of identical content.

This is not "find similar photos". Visual similarity is [M-05](../05-search-and-discovery/README.md).

## 3. Scope

**In scope**

- Starting a check from Insights or a folder row
- Library pick hub when several roots exist
- By folder / By file review, marking, column delete, confirmation
- Strong hash vs weak metadata matches
- Cancellation of the scan; Recycle Bin vs permanent delete

**Out of scope**

- How hashes are first recorded during a folder scan — [File identity & change tracking](../02-catalog-and-metadata/02-file-identity-and-change-tracking.md)
- Similar images from the item menu

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Progress and cancel in the dock | [Progress dock](../09-background-processing/02-progress-dock.md) |
| Folder scan that fills hashes | [Folder scan & catalog](../02-catalog-and-metadata/01-folder-scan-and-catalog/README.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-08-02.1 | Insights / folder-row start | Scan a library root or a chosen folder | shipped |
| F-08-02.2 | Library pick hub | Choose which root when more than one is added | shipped |
| F-08-02.3 | Background scan | **Check duplicate files — &lt;path&gt;** in the dock, cancellable | shipped |
| F-08-02.4 | By folder overview | Inside vs outside the selected tree, with size totals | shipped |
| F-08-02.5 | By file marking | Two columns: selected folder vs matching copies | shipped |
| F-08-02.6 | Weak-match warning | Amber note when there is no content hash | shipped |
| F-08-02.7 | Confirmed deletion | Recycle Bin / Trash default; catalog rows reconciled | shipped |

## 5. User journeys

Four journeys are in [journeys.md](journeys.md): Insights scan (J-08-02-1), folder-row check
(J-08-02-2), mark and delete (J-08-02-3), cancel a running scan (J-08-02-4).

## 6. Screens & UX

Hub, scanning shell, By folder / By file, and the delete dialog are in
[ux-screens.md](ux-screens.md).

## 7. Business rules

Hash limit (128 MiB), weak matching, 10,000-file delete cap, and cancellation are in
[business-rules.md](business-rules.md).

## 8. Settings & defaults

None — this feature exposes no user settings. Recycle Bin / Trash is a per-deletion checkbox
defaulting to on. **Include sub-folders** on the folder-row accordion defaults to on.

## 9. Data & persistence

Scan results are cached by job id for the session so the workspace can load when the pipeline
finishes. Marks for delete live only in that session. Successful deletes soft-delete catalog
rows; the files are in the trash or gone from disk. Content hashes live on catalog rows and
survive restart.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Catalog with items | Anything to compare | Hub: add folders and run a full scan first |
| Files on disk | Hashing rows that lack `content_hash` | Missing files are skipped and counted in scan stats |
| [M-09](../09-background-processing/README.md) | Scan and delete jobs | No progress card; enqueue error |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `enqueueFolderDuplicateScan` | `folderPath`, `recursive` (default true) | Queue **Check duplicate files** |
| Pipeline `folder-duplicate-scan` | Same | The scan job (`io` group) |
| `enqueueDuplicateMarkedFilesDelete` | `targets`, `useTrash`, `displayName` | Queue **Delete duplicate files (N)** |
| Pipeline `duplicate-marked-files-delete` | max 10,000 targets | Delete and reconcile |

`apps/desktop-media/src/renderer/actions/duplicate-files-actions.ts`.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/insights-section.spec.ts` | Hub vs auto-start; Back returns to hub |
| E2E | `apps/desktop-media/tests/e2e/duplicate-files-pipeline-cancel.spec.ts` | Running **X** cancels; completed **X** only dismisses |
| Unit | `apps/desktop-media/src/renderer/lib/duplicate-files-*.test.ts` | Folder split, marks, session after delete, weak paths |
| Unit | `apps/desktop-media/electron/lib/folder-duplicate-scan-weak.test.ts`, `folder-duplicate-scan-scope.test.ts` | Weak buckets; recursive scope |
| Unit | `apps/desktop-media/electron/pipelines/__tests__/folder-duplicate-scan-definition.test.ts`, `duplicate-marked-files-delete-definition.test.ts` | Pipeline params and caps |

**Coverage gaps:** no E2E for the confirmation dialog or Recycle Bin vs permanent delete; weak
matches are unit-tested, not in Playwright.

## 13. Known limitations & open questions

- **Limitation:** files larger than 128 MiB are not strongly hashed, so they may only appear as
  weak matches — or not at all.
- **Limitation:** the toolbar **More actions** menu does not start a duplicate check; only
  Insights and the folder-row menu do.
- **Limitation:** queued duplicate scans have no **X** on the dock card (only running cancel and
  completed dismiss).
- **Limitation:** delete is capped at 10,000 marked files per job.

## 14. References

- Module: [Insights & Library Health](../README.md)
- Detail: [journeys.md](journeys.md), [ux-screens.md](ux-screens.md),
  [business-rules.md](business-rules.md)
