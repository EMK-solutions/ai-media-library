---
id: F-08-03
module: 08-insights-and-library-health
title: Wrongly rotated images review
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/actions/rotation-review-actions.ts
  - apps/desktop-media/electron/ipc/rotation-review-handlers.ts
  - apps/desktop-media/electron/db/rotation-review-mutations.ts
  - packages/media-viewer/src/image-edit-suggestions-view.tsx
related:
  - F-03-03
  - F-08-01
  - F-01-03
---

# Wrongly rotated images review

> Go through the photos the app believes are stored sideways or upside down, preview the
> correction, and either write it to the file or dismiss the suggestion for good.

## 1. Summary

[Wrong rotation detection](../03-ai-image-analysis/03-wrong-rotation-detection.md) only records
a finding. This screen is where the user acts. Each item shows the original, a preview of the
suggested quarter-turn, the model's confidence, and **Save** / **Discard**. Save rotates the
pixels on disk in place, updates catalog size and face boxes, and marks the finding applied.
Discard hides the item permanently from this list and from folder wrongly-rotated counts. The
viewer itself has no rotate control — that is why this review exists.

## 2. User stories

- **As someone with a stack of scanned pages** I want to accept the suggested turn in one click,
  **so that** I do not open an editor per file.
- **As a cautious owner** I want to preview before Save, **so that** I do not flip a photo that
  was already upright.
- **As someone who disagrees with a finding** I want Discard to mean "never show this again",
  **so that** the list stays short.

Not for free-angle straighten — that is
[Image edit suggestions](../03-ai-image-analysis/04-image-edit-suggestions.md).

## 3. Scope

**In scope**

- Review list, pagination, include-subfolders toggle
- Preview, Save (90 / 180 / 270 clockwise), Discard
- Insights hub and the dashboard **View wrongly rotated images** link
- Opening the original in the viewer

**Out of scope**

- Running the orientation check — F-03-03
- Viewer zoom/rotate chrome — [Media viewer](../01-library-browsing-and-media-viewer/03-media-viewer-and-slideshow.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Which items qualify (angle, confidence, not dismissed) | [Wrong rotation detection](../03-ai-image-analysis/03-wrong-rotation-detection.md) |
| Starting the check from the dashboard | [Folder AI analysis dashboard](01-folder-ai-analysis-dashboard/README.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-08-03.1 | Review list | Paginated items (24 per page), sorted by confidence | shipped |
| F-08-03.2 | Include subfolders | Toggle on the review header | shipped |
| F-08-03.3 | Save | Rewrites the file; remaps faces; records applied metadata | shipped |
| F-08-03.4 | Discard | Permanent hide from review and counts | shipped |
| F-08-03.5 | Insights entry | Hub if several roots; else the list for the only root | shipped |

## 5. User journeys

### J-08-03-1 — Review from Insights

**Trigger:** Insights → **Wrongly rotated images**.
**Preconditions:** a library root exists; the orientation check has run on at least some images.

1. One root → the review opens for that path with subfolders included.
2. Several roots → pick a library card first.
3. Empty list copy: **No wrongly rotated images found for this folder.**
4. Close returns to browsing (or the hub after a multi-root pick).

**Outcome:** the user is looking at the actionable queue for that tree.

**Failure paths**

- Load error → **Unable to load wrongly rotated images.**

### J-08-03-2 — Save a suggested turn

**Trigger:** the user presses **Save** on an item.
**Preconditions:** the preview shows a 90, 180 or 270° clockwise turn.

1. The button shows **Saving...**.
2. The original file is rewritten; dimensions, size and mtime update in the catalog; face
   boxes are remapped; landmarks on those faces are cleared.
3. The row shows **Saved**.

**Outcome:** the photo is upright on disk and in the app.

**Failure paths**

- Write or catalog update fails → per-item error; the file is left as it was if the replace did
  not finish.

### J-08-03-3 — Discard a false finding

**Trigger:** the user presses **Discard**.

1. **Discarding...** then **Image rotation not needed - won't show again**.
2. The finding stays stored but is flagged dismissed; it never re-enters this list.

**Outcome:** the queue is shorter; a later rotation run does not bring the item back.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Review | Insights, dashboard link, Subfolders rotation cell | Title **Wrongly rotated images**, path, include subfolders, pagination, Save/Discard | `packages/media-viewer/src/image-edit-suggestions-view.tsx` (`variant="rotationReview"`) |
| Item preview | Each row | Original click → viewer; suggested preview; confidence; crop tag if analysis also suggested a crop | `packages/media-viewer/src/image-edit-suggestion-preview.tsx` |
| Insights hub | Several library roots | Same hub as other Insights flows | `desktop-insight-library-pick-hub.tsx` |

**States**

| State | What the user sees |
|---|---|
| Loading | List spinner |
| Empty | **No wrongly rotated images found for this folder.** |
| Preview generating | **Generating preview...** |
| Preview failed | **Unable to render preview for this image.** |

**UX notes** — Close aria-label is **Close wrongly rotated images**. Crop suggestions may appear
on the same card but Save/Discard here apply to rotation.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Save accepts only 90, 180 or 270 clockwise. | Matches what the detector emits. | `rotation-review-handlers.ts` |
| BR-2 | Save writes pixels in place (temp file then rename), not an EXIF orientation tag only. | Viewers that ignore tags still show the file upright. | `rotation-review-mutations.ts` |
| BR-3 | After Save, stored face boxes are remapped to the new pixel grid. | Face tags would otherwise sit on the wrong region. | Same |
| BR-4 | Discard is permanent (`permanent: true` in catalog AI metadata). | Accidental re-listing would undo the user's decision. | Same |
| BR-5 | The list is paged (24) and ordered by confidence (higher first). | Large libraries stay usable. | `DesktopMediaWorkspace.tsx`, `image-edit-suggestions-view.tsx` |
| BR-6 | Items below the confidence threshold or already dismissed never appear. | Keeps the queue trustworthy. | `folder-ai-wrongly-rotated-images` (F-03-03 BR-7 / BR-8) |

## 8. Settings & defaults

None on this screen. **Minimum AI confidence for wrong-rotation review** (default 0.9, advanced)
filters the list; owned by F-03-03 / M-11.

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Applied rotation metadata | `media_items.ai_metadata` | Item leaves the queue as fixed |
| Dismissal | Same | Item never returns |
| File bytes | Original path on disk | Save is destructive of the previous pixels |

Survives restart. Removing a library root does not undelete a rewritten file.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Orientation findings in the catalog | List contents | Empty list |
| Writable original file | Save | Per-item error |
| [M-01](../01-library-browsing-and-media-viewer/README.md) | Opening the original | Preview still works |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `saveWrongRotation` | `mediaItemId`, `angleClockwise` | Apply the turn |
| `discardWrongRotation` | `mediaItemId` | Dismiss forever |
| `media:get-folder-ai-wrongly-rotated-images` | folder, recursive, page, pageSize | Load the list |

`apps/desktop-media/src/renderer/actions/rotation-review-actions.ts`.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/insights-section.spec.ts` | Insights open; hub when two roots |
| E2E | `apps/desktop-media/tests/e2e/folder-ai-summary.spec.ts` | Open review from the dashboard card |
| Unit | `apps/desktop-media/electron/db/rotation-review-geometry.test.ts` | Box remap math |
| Unit | `apps/desktop-media/electron/db/rotation-review-ai-metadata.test.ts` | Applied / dismissed metadata |

**Coverage gaps:** Save/Discard success paths are not covered by E2E.

## 13. Known limitations & open questions

- **Limitation:** Save rewrites the original file. Unlike ratings, this is not an optional
  write-back.
- **Limitation:** there is no undo except restoring the file from backup or Recycle Bin if the
  user copied it first.
- **Limitation:** the viewer cannot rotate; users must come here (called out from F-01-03).

## 14. References

- Module: [Insights & Library Health](README.md)
- [Wrong rotation detection](../03-ai-image-analysis/03-wrong-rotation-detection.md)
- [Folder AI analysis dashboard](01-folder-ai-analysis-dashboard/README.md)
