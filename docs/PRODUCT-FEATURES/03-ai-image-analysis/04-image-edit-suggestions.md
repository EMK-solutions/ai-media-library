---
id: F-03-04
module: 03-ai-image-analysis
title: Image edit suggestions
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - packages/media-viewer/src/image-edit-suggestions-view.tsx
  - packages/media-viewer/src/image-edit-suggestion-preview.tsx
  - packages/media-viewer/src/image-edit-suggestion-section.tsx
  - apps/desktop-media/src/renderer/hooks/use-filtered-media-items.ts
  - apps/desktop-media/electron/photo-analysis-parser.ts
related:
  - F-03-01
  - F-03-03
---

# Image edit suggestions

> A side-by-side view of every photo in a folder that the AI thinks could be improved, with a
> rendered preview of what the fix would look like.

## 1. Summary

While it describes an image, the vision model also says what it would do to make the photo
better: crop it tighter, straighten a tilted horizon, brighten it, fix the colour temperature,
reduce noise or sharpen it. Each suggestion comes with a priority, a short reason and, where it
makes sense, concrete numbers — a crop rectangle, a straightening angle, an exposure step.

The **Image edit suggestions** screen turns that into something a person can act on. It lists one
row per image, with the original on the left and a live preview on the right showing the crop or
rotation applied. Suggestions that cannot be previewed — exposure, contrast, white balance,
denoise, sharpen — are listed underneath, split into high priority and other improvements.
Nothing here modifies files: the screen is a shortlist for a person who will do the editing
elsewhere. The one exception is rotation, which can be applied from the
[Wrongly rotated images review](../08-insights-and-library-health/03-wrongly-rotated-images-review.md)
built on the same view.

## 2. User stories

- **As a photographer triaging a shoot** I want a list of the frames worth fixing, **so that** I
  spend my editing time where it matters.
- **As a casual user** I want to see what a suggested crop would look like before I trust it,
  **so that** I do not have to imagine the result.
- **As someone with limited time** I want the most serious problems first, **so that** I can stop
  after the top few rows.
- **As a user fixing orientation** I want the same view to let me rotate and save,
  **so that** I do not switch screens.

## 3. Scope

**In scope**

- The full-pane list of images with suggestions in the current folder
- The rendered preview of crop and rotation, and the controls to toggle each on or off
- The grouping of remaining suggestions into high priority and other improvements
- The ordering of rows
- The same view reused as the rotation review screen

**Out of scope**

- Producing the suggestions — see [AI image analysis](01-ai-image-analysis.md)
- Deciding whether an image is stored the wrong way up — see
  [Wrong rotation detection](03-wrong-rotation-detection.md)
- Applying a rotation to the file on disk, and the review screen's own behaviour — see
  [Wrongly rotated images review](../08-insights-and-library-health/03-wrongly-rotated-images-review.md)
- Any actual image editing; the app never writes a cropped or brightened file

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-03-04.1 | Suggestions list | One row per image that has at least one suggestion | shipped |
| F-03-04.2 | Rendered preview | The crop, rotation and vertical flip applied on the spot in the browser canvas | shipped |
| F-03-04.3 | Preview toggles | Turn the suggested rotate or crop off to compare, and step the rotation a quarter turn at a time | shipped |
| F-03-04.4 | Priority grouping | High priority suggestions separated from the rest, with a badge per suggestion | shipped |
| F-03-04.5 | Actionable-first ordering | Images with something to preview come first, then by priority, then by name | shipped |
| F-03-04.6 | Open the original | Click the original image to open it in the viewer | shipped |
| F-03-04.7 | Rotation review variant | The same layout with Save and Discard controls and a confidence figure | shipped |

## 5. What the AI can suggest

| Suggestion (as shown) | What it means | Numbers the model provides | Previewable |
|---|---|---|---|
| Crop | Frame the subject or a document more tightly | A rectangle in relative coordinates | Yes |
| Straighten | Correct a small tilt | A signed angle between −15 and +15 degrees | No |
| Exposure fix | Brighten or darken | A step between −1.5 and +1.5 | No |
| Contrast fix | More or less contrast | A change between −100 and +100 | No |
| White balance fix | Warmer, cooler or a tint shift | Temperature and tint changes between −100 and +100 | No |
| Denoise | Reduce grain | A strength between 0 and 1 | No |
| Sharpen | Increase detail | A strength between 0 and 1 | No |
| Rotate | A quarter, half or three-quarter turn | The clockwise angle | Yes |

Every suggestion also carries a priority (high, medium or low, shown as **Unspecified** when the
model gives none), a short reason, and a confidence figure between 0 and 1.

## 6. User journeys

### J-03-04-1 — Review what could be improved in a folder

**Trigger:** the user selects a folder and chooses **Image edit suggestions** from the toolbar's
**More actions** menu.
**Preconditions:** the folder has been analysed by [AI image analysis](01-ai-image-analysis.md).

1. The media grid is replaced by the suggestions screen, headed **Image edit suggestions** with a
   summary reading **Suggested photos** and **High priority photos** with their counts.
2. Rows that have something to preview appear first, most serious first.
3. For each row the user compares **Original image** on the left with **Suggested preview** on the
   right.
4. Under the preview, **High priority suggestions** and **Other improvements** list the fixes that
   cannot be drawn, each with its reason and priority badge.
5. The user clicks **Back to photos** to return to the grid.

**Outcome:** a mental shortlist of which photos to edit and how.

**Alternate paths**

- The user clicks the original image → it opens in the full viewer.
- No folder is selected → the screen reads "Select a folder to view image edit suggestions."
- The folder has been analysed but nothing was suggested → "No AI image edit suggestions found
  for this folder."

### J-03-04-2 — Judge a suggested crop

**Trigger:** a row shows a suggested crop the user is unsure about.

1. The user clicks the **Crop** tag above the preview to switch the crop off; the preview redraws
   without it.
2. They click it again to bring it back.
3. If the row also has a rotation, the **Rotate** tag, a rotate-clockwise control and a
   flip-vertically control let them try other orientations.
4. Switching everything off leaves the message "No active preview adjustments. Toggle Rotate/Crop
   tags to re-enable."

**Outcome:** the user has seen both versions and can decide.

**Failure paths**

- The image cannot be loaded or drawn → "Unable to render preview for this image."

### J-03-04-3 — Fix orientation from the review screen

**Trigger:** the user opens **Wrongly rotated images** from the folder AI analysis summary or from
Insights.

1. The same layout appears, titled **Wrongly rotated images** with the folder path beside it,
   and rows sorted by the detector's confidence, highest first.
2. Each preview shows **Save**, **Discard** and the model's confidence as a percentage.
3. Saving applies the rotation; discarding marks the image as not needing one and it never
   returns to the list.

**Outcome:** orientation is fixed in place. The behaviour of Save and Discard is documented in
[Wrongly rotated images review](../08-insights-and-library-health/03-wrongly-rotated-images-review.md).

## 7. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Image edit suggestions | Toolbar **More actions** (⋮) → **Image edit suggestions** | Header with counts and **Back to photos**; one card per image with original, preview and suggestion lists | `packages/media-viewer/src/image-edit-suggestions-view.tsx` |
| Suggested preview | Inside each card | Rotate and Crop tags, rotate-clockwise and flip-vertically controls, the rendered image | `packages/media-viewer/src/image-edit-suggestion-preview.tsx` |
| Suggestion lists | Inside each card | **High priority suggestions** and **Other improvements**, each entry with a type, a priority badge, a reason and a **Shown in preview** marker | `packages/media-viewer/src/image-edit-suggestion-section.tsx` |
| Wrongly rotated images | Folder AI analysis summary or Insights | The same layout with Save, Discard, confidence, paging and an include-sub-folders toggle | Same view, rotation review variant |

**States**

| State | What the user sees |
|---|---|
| No folder selected | "Select a folder to view image edit suggestions." |
| Loading | "Loading image edit suggestions..." |
| Nothing to suggest | "No AI image edit suggestions found for this folder." |
| Preview building | A spinner with "Generating preview..." |
| Preview failed | "Unable to render preview for this image." |

**UX notes**

- The suggestions screen takes over the main pane and hides the normal toolbar, so it reads as a
  focused task rather than a filter over the grid.
- The preview is drawn in the app itself from the original file; nothing is written to disk and
  nothing is uploaded.
- Crop and rotate never appear in the written lists, because they are already visible in the
  preview; every other suggestion type appears only in the lists.

## 8. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Only images are listed; videos never appear. | Suggestions come from still-image analysis. | `apps/desktop-media/src/renderer/hooks/use-filtered-media-items.ts` |
| BR-2 | An image with no suggestions is not listed at all. | The screen is a shortlist, not an inventory. | `packages/media-viewer/src/image-edit-suggestions-view.tsx` |
| BR-3 | Rotation shown here always comes from the orientation check, never from the vision model. | One authority for orientation avoids contradictory advice. | `apps/desktop-media/src/renderer/hooks/use-filtered-media-items.ts` |
| BR-4 | An image whose rotation the user has dismissed shows no rotation suggestion. | Dismissal must stick. | Same |
| BR-5 | A rotation suggestion is always ranked high priority and placed first in its row. | It is the only suggestion the user can act on in the app. | Same |
| BR-6 | Rows with a previewable change come before rows without one, then higher priority first, then alphabetically. | Puts actionable work at the top. | `packages/media-viewer/src/image-edit-suggestions-view.tsx` |
| BR-7 | In the rotation review variant, rows are ordered by detection confidence, highest first. | The most certain fixes are reviewed first. | Same |
| BR-8 | Only the first rotation and the first crop in an image's suggestions are drawn. | Two conflicting crops cannot both be previewed. | `packages/media-viewer/src/image-edit-suggestions-utils.ts` |
| BR-9 | Suggestions whose numbers fall outside the documented ranges are discarded when the model's answer is read. | Nonsense parameters would produce nonsense previews. | `apps/desktop-media/electron/photo-analysis-parser.ts` |
| BR-10 | A crop rectangle must stay inside the image, with a small tolerance, and is trimmed to fit; otherwise it is dropped. | Prevents previews of impossible crops. | Same |
| BR-11 | Identical suggestions returned twice are collapsed into one. | Some models repeat themselves. | Same |
| BR-12 | The preview is rendered from the original file in the app, and is discarded when the row is no longer shown. | Keeps memory use bounded and avoids writing temporary files. | `packages/media-viewer/src/image-edit-suggestion-preview.tsx` |

## 9. Settings & defaults

This feature has no settings of its own. What it can show is decided by
[AI image analysis](01-ai-image-analysis.md) and
[Wrong rotation detection](03-wrong-rotation-detection.md), whose defaults are listed in those
documents.

## 10. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Edit suggestions with type, priority, reason, confidence and parameters | `media_items.ai_metadata` | The rows and lists on this screen |
| Orientation finding | Same, under orientation detection | The rotation shown at the top of a row |
| Dismissal of a rotation | Same, under the dismissal entry | The rotation disappears from this screen for good |

Nothing on this screen is stored. Toggling rotate or crop, stepping the rotation or flipping the
preview affects only the current session.

## 11. Automatable actions & API surface

| Action | Parameters | Intent |
|---|---|---|
| Open image edit suggestions | — | Switch the main pane to the suggestions view for the selected folder |
| Open rotation review | `folderPath`, `includeSubfolders` | Open the rotation review variant scoped to a folder |
| Close the view | — | Return to the previous main pane |

The view itself is a shared component consumed by both entry points, so a change to layout or
ordering applies to both at once.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/image-edit-suggestions-view.spec.ts` | A stored rotation finding survives a later image analysis run over the same item, so the rotation row does not disappear |

**Coverage gaps:** the ordering rules, the priority grouping, the preview toggles and the
canvas-rendered preview itself have no automated tests.

## 13. Known limitations & open questions

- **Limitation:** the app cannot apply any suggestion except rotation. Crop, exposure, contrast,
  white balance, denoise and sharpen are advice only.
- **Limitation:** the list covers the images currently loaded for the selected folder, so it does
  not reach into sub-folders the way the rotation review variant can.
- **Limitation:** there is no way to dismiss or hide a suggestion the user disagrees with, except
  for rotation.
- **Limitation:** each preview is rendered from the full-size original, so a folder of very large
  photos makes the screen slow to fill in.
- **Limitation:** the model is asked for a straightening angle but the preview cannot draw it, so
  a tilt shows up only as text.

## 14. References

- Module: [AI Image Analysis](README.md)
- [AI image analysis](01-ai-image-analysis.md) — where suggestions come from
- [Wrong rotation detection](03-wrong-rotation-detection.md) — where the rotation row comes from
- [Wrongly rotated images review](../08-insights-and-library-health/03-wrongly-rotated-images-review.md) — the variant that can act
- Implementation history: `docs/IMPLEMENTATION-LOG/features/2026-03_desktop-media_suggestions_view_*.plan.md`,
  `docs/IMPLEMENTATION-LOG/features/2026-03_improve_rotate_crop_prompts_*.plan.md`
