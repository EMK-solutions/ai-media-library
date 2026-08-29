---
id: F-02-07
module: 02-catalog-and-metadata
title: AI result invalidation
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/electron/db/media-ai-invalidation.ts
  - apps/desktop-media/electron/db/media-ai-invalidation-guards.ts
  - apps/desktop-media/electron/db/media-item-metadata.ts
related:
  - F-02-01
  - F-02-02
  - F-02-06
---

# AI result invalidation

> When a photo on disk actually changes, throw away the AI work that no longer applies — and
> leave it alone when the change was only a rating or a title.

## 1. Summary

AI pipelines are expensive. Face detection, image analysis and search indexing can take seconds
per photo, and the user's confirmations (face tags, ratings) sit on top of that work. If every
catalog refresh treated the file as new, a rating write or an XMP title edit would wipe hours of
processing. If the app *never* discarded results, replacing a file with a different photo at the
same path would leave the old faces and descriptions attached to the new pixels.

This feature is the decision in the middle: after a folder scan (or a trusted write-back)
refreshes a catalog row, the app asks whether the **pixels and geometry** changed. If they did,
it clears image analysis, face detections and tags, and the search index for that file, and
signals that the file needs AI pipelines again. If they did not — same size, same orientation,
typical metadata-only rewrite — everything the user built is kept.

The user never opens a screen for this. They notice it as folder status indicators going back to
"needs processing", or as faces and descriptions still being there after they rated a photo.

## 2. User stories

- **As someone who rates photos** I want rating a file not to cost me its face tags or search
  index, **so that** organising the library does not undo processing.
- **As someone who replaced a photo with a better export** I want the old faces and description
  gone, **so that** I am not looking at analysis of a picture that is no longer there.
- **As someone running pipelines in "missing only" mode** I want replaced files to show up as
  missing again, **so that** they get re-analysed without me having to force a full re-run.

## 3. Scope

**In scope**

- The rules that decide whether a catalog refresh discards AI results
- What is cleared when invalidation runs, and what is kept
- The `needs AI follow-up` signal that folder status and later pipelines consume

**Out of scope**

- Running the pipelines again — owned by [M-09 Background Processing](../09-background-processing/README.md)
  and the pipeline features themselves
- Showing coverage in the folder dashboard — owned by
  [M-08 Insights & Library Health](../08-insights-and-library-health/README.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Detecting that a file changed, moved or was replaced | [File identity & change tracking](02-file-identity-and-change-tracking.md) |
| Trusted rating write-back | [Embedded metadata write-back](06-embedded-metadata-write-back.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-02-07.1 | Geometry-aware decision | Metadata-only edits keep AI work; pixel/geometry changes discard it | shipped |
| F-02-07.2 | Follow-up signal | Folders with newly invalidated files are marked as needing AI pipelines | shipped |

## 5. User journeys

### J-02-07-1 — Rate a photo without losing AI work

**Trigger:** write-back is on, and the user changes a star rating.
**Preconditions:** the photo already has face tags and a search index.

1. The user rates the photo.
2. The catalog updates, ExifTool writes the file, the file's hash and modification time change.
3. The refresh is treated as a trusted metadata edit with unchanged width, height and orientation.
4. Face tags, descriptions and the search index stay.

**Outcome:** the rating is saved; processing is intact.

### J-02-07-2 — Replace a file at the same path

**Trigger:** the user overwrites a JPEG with a different image and re-scans.

1. The scan sees a different content hash and/or different dimensions.
2. Image analysis, face detections (including tags on those faces) and search vectors for that
   item are cleared. Wrong-rotation notes are kept, because they describe orientation, not
   content.
3. The scan's completion summary reports the file as needing AI follow-up.
4. The folder's status indicators show pipelines as incomplete. A later **missing only** run
   processes the new pixels.

**Outcome:** the user is not looking at analysis of the old picture.

**Alternate paths**

- Brand-new file (no prior catalog row) → treated as needing follow-up without an invalidation
  step, because there is nothing to discard.

## 6. Screens & UX

There is no dedicated screen. Effects surface as:

| Where | What the user sees |
|---|---|
| Folder tree status icons | Pipelines that were complete may return to waiting |
| Folder AI analysis summary | Coverage counts drop for the affected files |
| Background operations | Scan completion can list files needing AI follow-up |
| Viewer / People | Faces and descriptions gone for a replaced file; still present after a rating |

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Invalidate when decoded width, height or orientation changed. | The image the pipelines analysed is no longer the image on disk. | `apps/desktop-media/electron/db/media-ai-invalidation-guards.ts` |
| BR-2 | If both old and new content hashes exist and differ, still **keep** AI results when width, height and orientation are unchanged. | ExifTool rating/title writes change the whole-file hash without changing pixels. | `apps/desktop-media/electron/db/media-ai-invalidation-guards.ts` |
| BR-3 | Filling in a hash that was previously missing does not invalidate. | Hashes are often computed on a later pass for the same file. | `apps/desktop-media/electron/db/media-ai-invalidation-guards.ts` |
| BR-4 | Losing a hash that was previously present does invalidate. | Unusual; safer to re-run than to trust stale results. | `apps/desktop-media/electron/db/media-ai-invalidation-guards.ts` |
| BR-5 | When no hash is available on either side, a change in byte size or modification time invalidates. | Replacement cannot otherwise be distinguished from a metadata touch. | `apps/desktop-media/electron/db/media-ai-invalidation-guards.ts` |
| BR-6 | A caller can mark a refresh as a trusted embedded-metadata write; if geometry is unchanged, invalidation is suppressed even when other signals would fire. | Rating write-back on large files may skip a strong hash. | `apps/desktop-media/electron/db/media-ai-invalidation-guards.ts` |
| BR-7 | When invalidation runs, the app clears image-analysis completion, face-detection completion, all search index rows for the item, all face instances (and therefore their tags), and the AI description/people fields — but keeps wrong-rotation detection. | Faces and descriptions belong to the old pixels; orientation notes are still a useful starting point. | `apps/desktop-media/electron/db/media-ai-invalidation.ts` |
| BR-8 | A new catalog row, or a refresh that invalidates, reports the file as needing AI pipeline follow-up; a metadata-only refresh does not. | Sidebar highlights and "missing only" runs should target real work. | `apps/desktop-media/electron/db/media-item-metadata.ts` |

## 8. Settings & defaults

None — this feature exposes no user settings.

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Pipeline timestamps (`photo_analysis_processed_at`, `face_detection_processed_at`, …) | `media_items` | Whether the file looks "done" in folder status |
| Search index rows | `media_embeddings` | Whether AI search can find this file |
| Face instances | `media_face_instances` | Face boxes and tags on this photo |
| `needsAiPipelineFollowUp` | Scan job result (not stored as a user field) | Folder is marked as having catalog changes that need AI |

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Folder scan producing old and new snapshots | Making the decision at all | No invalidation; stale AI may remain until a later scan |
| [File identity](02-file-identity-and-change-tracking.md) hashes | Distinguishing rewrite from replacement | Falls back to size/mtime when hashes are missing |

## 11. Automatable actions & API surface

No user-facing action. The decision runs inside `upsertMediaItemFromFilePath` during a scan or
after a trusted write. Scan completion events include `filesNeedingAiPipelineFollowUp`.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| Unit | `apps/desktop-media/electron/db/media-ai-invalidation-guards.test.ts` | Hash/geometry/trusted-write decision table |
| E2E | `apps/desktop-media/tests/e2e/metadata-scan-edited-file-reset.spec.ts` | Replacing a file at the same path refreshes catalog geometry |

**Coverage gaps:** no E2E asserts that face tags survive a rating write-back; that is covered at
unit level by the trusted-write guards.

## 13. Known limitations & open questions

- **Limitation:** clearing face instances also clears confirmed tags on that photo. Replacing a
  file means re-tagging faces on it, even if the people in the picture look the same.
- **Limitation:** wrong-rotation detection is preserved across invalidation; if the replacement
  file has a different orientation problem, the old note may be misleading until rotation
  detection runs again.
- **Open question:** whether confirmed person tags should be offered as suggestions on the new
  file rather than deleted outright.

## 14. References

- Module: [Catalog & Metadata](README.md)
- [Folder scan & catalog](01-folder-scan-and-catalog/README.md)
- [Embedded metadata write-back](06-embedded-metadata-write-back.md)
- Implementation history: `docs/IMPLEMENTATION-LOG/features/2026-04_selective_ai_invalidation_3afd0269.plan.md`,
  `docs/IMPLEMENTATION-LOG/features/2026-04_avoid_ai_invalidation_on_rating_embed_77039b62.plan.md`
