---
id: F-05-05
module: 05-search-and-discovery
title: Find similar images
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/actions/similar-images-actions.ts
  - apps/desktop-media/src/renderer/components/similar-images/desktop-similar-images-workspace.tsx
  - apps/desktop-media/electron/ipc/similar-images-handlers.ts
  - apps/desktop-media/electron/db/semantic-search.ts
related:
  - F-05-02
  - F-01-07
  - F-01-03
---

# Find similar images

> Start from one photo and see the pictures in the library that look most like it.

## 1. Summary

**Find similar** is a per-image action, not a text search. From the item menu the user opens a
dedicated **Similar images** workspace seeded by that file. The app compares its visual
embedding with every other indexed photo, keeps neighbours above a similarity level (default
**90%**), and lists them in the same grid/list styles as the rest of the app. The source photo
is included at the top as a perfect match. Opening a neighbour carries this list in the viewer.

This needs the same visual index as [AI image search](01-ai-image-search.md). It does not use
description matching, people filters, or the search panel.

## 2. User stories

- **As someone with a burst of near-duplicates** I want the other frames that look like this
  one, **so that** I can keep the sharpest.
- **As someone who found the right mood in one photo** I want more like it from the whole
  library, **so that** I do not retype a search.
- **As someone unsure how strict to be** I want to drop the similarity level,
  **so that** looser cousins appear without starting over.

Not for: videos (the action is hidden), or photos that have never been indexed.

## 3. Scope

**In scope**

- Opening Similar images from the item menu
- Similarity level chips and what they mean
- Grid and list presentation, pagination, viewer carry-set
- Errors when the source is not indexed

**Out of scope**

- Adding the action to the menu chrome — see
  [Media item actions](../01-library-browsing-and-media-viewer/07-media-item-actions.md)
- Building the visual index — see [Search indexing](02-search-indexing.md)
- Text queries — see [AI image search](01-ai-image-search.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Item ⋮ placement and hiding on video | [Media item actions](../01-library-browsing-and-media-viewer/07-media-item-actions.md) |
| Viewer overlay | [Media viewer](../01-library-browsing-and-media-viewer/03-media-viewer-and-slideshow.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-05-05.1 | Open from an image | Workspace seeded with that file at 90% similarity | shipped |
| F-05-05.2 | Similarity levels | 95% / 90% / 85% / 80% / 75% / 70% chips; changing one reloads | shipped |
| F-05-05.3 | Grid and list | Same view-mode toggle idea as browsing; list shows a similarity percent | shipped |
| F-05-05.4 | Pagination | Pages of 48, same size as album pages | shipped |

## 5. User journeys

### J-05-05-1 — Pivot from a keepers photo

**Trigger:** the user opens ⋮ on an image in the grid, a search result, or a list row.
**Preconditions:** that image has a ready visual embedding from
[Search indexing](02-search-indexing.md).

1. They choose **Find similar**.
2. The Similar images workspace opens with **Similarity level** on **90%**.
3. The source image is first; up to 99 neighbours at or above 90% follow.
4. They click a neighbour; the viewer opens on this similar-images list.
5. Back returns to whatever they were browsing.

**Outcome:** a short list of look-alikes from the whole library.

**Alternate paths**

- User picks **70%** → more (and looser) neighbours; **95%** → fewer, stricter.
- Grid vs list toggle uses the app view mode.

**Failure paths**

- Source not indexed → error: "Image is not indexed for AI search yet. Index images for this
  library first."
- Invalid threshold (not a finite value in (0, 1]) → "Invalid similarity threshold."
- Load error → "Could not load similar images."
- Indexed but nothing else meets the level → empty copy suggesting a lower threshold or
  indexing more photos.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Similar images workspace | Item ⋮ **Find similar** | Back, title **Similar images**, view-mode toggle, Similarity level chips, grid/list, pagination | `apps/desktop-media/src/renderer/components/similar-images/desktop-similar-images-workspace.tsx` |

**States**

| State | What the user sees |
|---|---|
| Loading | Spinner and "Finding similar images…" |
| Error | Destructive message with the server or fallback text |
| No neighbours at this level | "No images match this similarity level. Try a lower threshold or index more photos for AI search." |
| Results | Grid of thumbnails, or list rows with `Similarity: NN%` |

**UX notes**

- Similarity percents are rounded; a score just under 1.0 is shown as **99%**, not 100%, so only
  the source reads as identical.
- Search-result grids also expose Find similar through the same item menu.
- The workspace is global: it is not limited to the folder that was selected.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Opening Find similar without an explicit threshold uses **0.9** (90%). | Strict enough for near-duplicates; chips can loosen it. | `similar-images-actions.ts` |
| BR-2 | Available levels are 95, 90, 85, 80, 75 and 70 percent. | A small, labelled set instead of a raw cosine. | `SIMILAR_IMAGES_THRESHOLD_PERCENTS` |
| BR-3 | The source image is always first with score 1 when lookup succeeds. | The user must see the photo they started from. | `searchSimilarImagesBySourcePath` |
| BR-4 | At most 99 neighbours are returned. | Keeps the workspace bounded. | `MAX_SIMILAR_NEIGHBORS` in `semantic-search.ts` |
| BR-5 | Neighbours must have cosine similarity ≥ the chosen minimum. | The chips are a hard floor, not a sort hint. | `semantic-search.ts` |
| BR-6 | Comparison uses stored **image** embeddings only (the visual index). | Find similar is "looks like", not "captioned like". | `searchSimilarImagesBySourcePath` |
| BR-7 | If the source has no ready image embedding, the call fails with the index-first message. | Prevents an empty workspace that looks like "no similar photos". | `semantic-search.ts` |
| BR-8 | Find similar is not offered on videos. | There is no visual index for video files. | `DesktopMediaItemActionsMenu.tsx` |
| BR-9 | Page size is 48. | Matches album paging so the layout stays familiar. | `SIMILAR_IMAGES_PAGE_SIZE` |

## 8. Settings & defaults

None — this feature exposes no Settings page controls.

| Control | Default |
|---|---|
| Similarity level on open | 90% |
| Page size | 48 |

## 9. Data & persistence

The similar-images session (source path and threshold) is in-memory in the desktop app. It does
not survive restart. Results are computed from stored visual embeddings.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Ready visual embedding for the source | Starting the search | Index-first error |
| Visual embeddings for other photos | Neighbours | Empty state at this similarity level |
| sqlite-vec when available | Faster neighbour lookup | Same results via a full scan fallback if sqlite-vec is not loadable |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `openSimilarImagesView` | `sourcePath`, optional `minSimilarity` (default 0.9) | Open the workspace |
| `media:find-similar-images` | `sourcePath`, `minSimilarity` | Return `{ ok: true, results }` or `{ ok: false, error }` |

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| Unit | `apps/desktop-media/src/renderer/actions/similar-images-actions.test.ts` | Default 0.9 and explicit threshold |
| Unit | `apps/desktop-media/src/renderer/components/DesktopMediaItemActionsMenu.test.ts` | Menu shows Find similar for images, hides it for videos and when no handler |

**Coverage gaps:** no E2E for the workspace, chips, pagination, or the unindexed error path.
Neighbour ranking (sqlite-vec vs classic scan) has no dedicated unit test file.

## 13. Known limitations & open questions

- **Limitation:** results are library-wide; there is no folder-scoped Find similar.
- **Limitation:** the source is always included, so the first thumbnail is the photo the user
  already had.
- **Open question:** whether similarity should also consider description embeddings for
  "same subject, different crop" cases the visual index misses.

## 14. References

- Module: [Search & Discovery](README.md)
- [Search indexing](02-search-indexing.md)
- [Media item actions](../01-library-browsing-and-media-viewer/07-media-item-actions.md)
- J-X2: [`../JOURNEYS.md`](../JOURNEYS.md)
