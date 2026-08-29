---
id: F-03-03
module: 03-ai-image-analysis
title: Wrong rotation detection
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/electron/orientation-preprocess.ts
  - apps/desktop-media/electron/pipelines/definitions/image-rotation-precheck.ts
  - apps/desktop-media/electron/face-rotation-check.ts
  - apps/desktop-media/electron/db/media-analysis.ts
  - apps/desktop-media/electron/db/folder-ai-wrongly-rotated-images.ts
related:
  - F-03-01
  - F-03-04
---

# Wrong rotation detection

> Find the photos and scans that are stored sideways or upside down, so they can be fixed in one
> review pass instead of one file at a time.

## 1. Summary

Scanned pages, phone photos and files that have lost their orientation tag often sit in a library
the wrong way up. This feature checks each image with a small dedicated model that classifies the
whole picture as upright, quarter-turned either way, or upside down, and records the correction
angle needed to make it upright. When that model cannot decide, and faces have already been
detected in the image, the geometry of those faces is used instead: eyes, nose and mouth make a
reliable, deterministic clue about which way is up.

The check is deliberately cheap and runs before the heavy pipelines, so orientation is already
known by the time face detection, search indexing or full image analysis look at a picture. What
it produces is a finding, not a change: the actual rotation is applied by the user in the
**Wrongly rotated images** review screen, described in
[Insights & Library Health](../08-insights-and-library-health/03-wrongly-rotated-images-review.md).

## 2. User stories

- **As someone who scanned an album** I want the app to point out the pages that came out
  sideways, **so that** I do not have to open each one to check.
- **As a library owner** I want orientation sorted out before faces and descriptions are
  computed, **so that** those results are not thrown off by an upside-down picture.
- **As a cautious user** I want only confident findings shown to me, **so that** the review list
  is short and worth going through.
- **As a user who has already tidied a folder** I want a re-run to skip the images it has
  already judged, **so that** repeated checks are fast.

## 3. Scope

**In scope**

- Deciding, per image, whether it needs a quarter, half or three-quarter turn to look upright
- Running that check automatically ahead of the other AI pipelines
- Running it explicitly for a folder from the folder analysis summary
- The face-geometry fallback when the classifier cannot decide
- The confidence threshold that controls which findings reach the user
- Recording failures so a folder's rotation coverage is honest

**Out of scope**

- Applying or dismissing a rotation, and the review screen itself — see
  [Wrongly rotated images review](../08-insights-and-library-health/03-wrongly-rotated-images-review.md)
- Rotation the user performs manually on a single image — see
  [Library Browsing & Media Viewer](../01-library-browsing-and-media-viewer/README.md)
- Reading the EXIF orientation tag during a folder scan — see
  [Catalog & Metadata](../02-catalog-and-metadata/README.md)

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-03-03.1 | Orientation classifier | A confident correction angle for most images, from a downloaded model | shipped |
| F-03-03.2 | Face-geometry fallback | A decision for images the classifier could not judge, when faces are known | shipped |
| F-03-03.3 | Automatic pre-check | The check runs ahead of search indexing, face detection and image analysis | shipped |
| F-03-03.4 | Folder rotation run | An explicit run for a folder and its sub-folders, with live progress | shipped |
| F-03-03.5 | Confidence threshold | Only findings above the threshold reach the review list and the folder counts | shipped |
| F-03-03.6 | Failure recording | Images the check could not judge are counted separately, with the reason stored | shipped |

## 5. User journeys

### J-03-03-1 — Rotation is checked as a side effect of running AI

**Trigger:** the user starts AI image analysis, face detection or AI search indexing on a folder.
**Preconditions:** the rotation check is enabled (it is by default) and the orientation model has
been downloaded.

1. Before each image is handed to the main pipeline, the app checks its orientation.
2. Images that already have a stored orientation finding are skipped instantly.
3. The user sees nothing extra; the finding simply appears later in the folder summary.

**Outcome:** the **Wrongly rotated images** card in the folder AI analysis summary starts showing
a count without the user having asked for it.

**Alternate paths**

- The check is switched off in Settings → nothing is computed during other pipelines, and the
  rotation card stays empty until an explicit run.

### J-03-03-2 — Run the check for a folder on purpose

**Trigger:** the user opens the folder AI analysis summary and presses the run control on the
**Wrongly rotated images** card.

1. The job always covers the folder and all its sub-folders.
2. A **Wrongly rotated images** card appears in the Background operations dock, naming the
   folder and showing processed / total, how many wrongly rotated images were found, and how many
   were skipped or failed.
3. When it finishes, the card's count matches what the review screen will show.

**Outcome:** the user can go straight to **View wrongly rotated images** and start fixing.

**Alternate paths**

- Images that were already checked are skipped, so a second run over a mostly-done folder is
  nearly instant.
- The user cancels from the dock → the run stops and findings made so far are kept.

**Failure paths**

- The orientation model cannot be downloaded → a download failure appears in the Background
  operations dock naming the orientation model, and the check falls back to face geometry.
- Neither signal can decide → the image is counted as failed for rotation and the reason is
  stored against it.

### J-03-03-3 — Keep the review list trustworthy

**Trigger:** the review list contains findings the user disagrees with.

1. The user opens Settings → **Wrong image rotation detection** (advanced settings must be shown).
2. They raise **Minimum AI confidence for wrong-rotation review** above its default of 0.9.
3. Lower-confidence findings immediately drop out of both the review list and the folder counts;
   they are not deleted, only hidden.

**Outcome:** a shorter, more reliable list.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| **Wrongly rotated images** card | Folder AI analysis summary | Coverage percentage, **Analyzed** and **Wrongly rotated** counts, failed count, a run control and a **View wrongly rotated images** link | `apps/desktop-media/src/renderer/components/folder-ai-summary/DesktopFolderAiSummaryDashboard.tsx` |
| **Rotation analysis** column | Folder AI analysis summary, sub-folder table | The same coverage per sub-folder | `apps/desktop-media/src/renderer/components/DesktopFolderAiSummaryTable.tsx` |
| **Wrongly rotated images** progress card | Background operations dock | Processed / total, wrongly rotated, skipped, failed, cancel | `apps/desktop-media/src/renderer/components/progress-dock/cards/ImageRotationCard.tsx` |
| Settings → **Wrong image rotation detection** | Settings, advanced settings shown | Three controls plus **Reset to defaults** | `apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx` |
| **Wrongly rotated images** explainer | The information control on the summary card | A short slide explaining what the check does | `apps/desktop-media/src/renderer/components/folder-ai-summary/PipelineOnboardingModal.tsx` |

**UX notes**

- The whole settings group is marked advanced and is hidden entirely when the user has chosen to
  hide advanced settings; the defaults then apply silently.
- Turning the check on in Settings immediately starts downloading the orientation model if it is
  not present, rather than waiting for the first run.
- The review link only appears when at least one wrongly rotated image was found.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | An image that already has a stored orientation finding is skipped unless the run was asked to override existing results. | Repeat runs over a large library must be cheap. | `apps/desktop-media/electron/orientation-preprocess.ts` |
| BR-2 | The orientation classifier is the primary signal; face geometry is only consulted when the classifier is unavailable or fails. | The classifier works on any image, faces or not. | Same |
| BR-3 | A finding from the classifier always replaces a finding from face geometry, but not the other way round. | The stronger signal wins, regardless of run order. | `apps/desktop-media/electron/db/media-analysis.ts` |
| BR-4 | Face geometry is only trusted when the existing faces give a confidence of at least 0.4 and either agree unanimously or there is a single face. | Ambiguous face angles produce worse guesses than no guess. | `apps/desktop-media/electron/face-rotation-check.ts` |
| BR-5 | The face fallback uses faces stored by a previous face-detection run; it never runs face detection itself. | Keeps the pre-check fast and cheap. | Same |
| BR-6 | When the classifier fails and the fallback is switched off, or when both fail, the image is recorded as a rotation failure with the reason. | The folder summary must distinguish "upright" from "could not tell". | `apps/desktop-media/electron/orientation-preprocess.ts` |
| BR-7 | Only images whose correction angle is 90, 180 or 270 degrees and whose confidence is at least the threshold (default 0.9) appear in the review list and the wrongly-rotated counts. | Keeps the user's review queue trustworthy. | `apps/desktop-media/electron/db/folder-ai-wrongly-rotated-images.ts` |
| BR-8 | An image the user has dismissed never comes back into the review list. | Dismissal is a decision, not a filter. | Same |
| BR-9 | A finding that is older than a recorded failure for the same image is treated as stale. | The newest attempt is the truth. | Same |
| BR-10 | Storing a new orientation finding removes any rotation entry from that image's edit suggestions. | Rotation is presented from one place only. | `apps/desktop-media/electron/db/media-analysis.ts` |
| BR-11 | An explicit folder rotation run works even when the "run before other pipelines" setting is off. | Asking for the check directly is an unambiguous instruction. | `apps/desktop-media/electron/pipelines/definitions/image-rotation-precheck.ts` |
| BR-12 | Rotation jobs run in the graphics resource group, one at a time by default. | Keeps the model off the same slot as the language model. | `apps/desktop-media/src/shared/pipeline-types.ts` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| Analyze image rotation need before running other AI pipelines | On | Runs the check ahead of search indexing, face detection and image analysis | Yes |
| Use face landmark features to detect photo rotation (fallback method) | On | Allows the face-geometry fallback when the classifier cannot decide | Yes |
| Minimum AI confidence for wrong-rotation review | 0.9 | Findings below this are hidden from the review list and folder counts | Yes |

Defined in `apps/desktop-media/src/shared/ipc.ts`
(`DEFAULT_WRONG_IMAGE_ROTATION_DETECTION_SETTINGS`). The orientation model itself is fixed:

| Model | Default | Size | Licence |
|---|---|---|---|
| Deep Image Orientation (EfficientNetV2) | `deep-image-orientation-v1` | About 80 MB, downloaded on demand | Apache-2.0 |

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Correction angle, confidence, signal used, model and time | `media_items.ai_metadata` under orientation detection | Drives the review list and the wrongly-rotated counts |
| Failure message and time | Same, under the orientation error entry | Counted as failed on the rotation card |
| User dismissal | Same, under the dismissal entry | Permanently removes the image from the review list |

Findings survive restarts. Re-running with override recomputes them; a normal run leaves them
alone.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| The downloaded orientation model | The primary signal | A download failure card naming the orientation model, then reliance on the fallback |
| Previously detected faces | The fallback signal | Images without stored faces simply fail the check |
| [Background processing](../09-background-processing/README.md) | Queueing and progress | No progress card and no cancel control |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `enqueueFolderAiPipeline` with `pipeline: "rotation"` | `folderPath`, `recursive`, `overrideExisting` | Queue a rotation check for a folder |
| Pipeline `image-rotation-precheck` | `folderPath`, `recursive`, `force` | The queued job itself |
| `media:detect-folder-image-rotation` | folder scope | Legacy direct entry point for the same check |
| `media:cancel-image-rotation-detection` | `jobId` | Stop a running check |
| `media:image-rotation-progress` | — | Progress events consumed by the dock |

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| Unit | `apps/desktop-media/electron/orientation-preprocess.test.ts` | A failure is recorded with the right reason when both signals fail, and when the fallback is switched off |
| Unit | `apps/desktop-media/electron/db/folder-ai-wrongly-rotated-images.test.ts` | Which images qualify for the review list, including the confidence threshold and dismissal |
| Unit | `apps/desktop-media/electron/db/rotation-review-geometry.test.ts` | The geometry used when a rotation is previewed and applied |
| Unit | `apps/desktop-media/electron/jpeg-exif-orientation.test.ts` | Reading and writing the JPEG orientation tag |
| E2E | `apps/desktop-media/tests/e2e/rotation-crop-face-detection.spec.ts` | Rotation findings alongside face detection on rotated images |
| E2E | `apps/desktop-media/tests/e2e/image-edit-suggestions-view.spec.ts` | A stored rotation finding survives a later image analysis run over the same item |
| E2E | `apps/desktop-media/tests/e2e/folder-ai-summary.spec.ts` | The folder summary, including the rotation card |

**Coverage gaps:** the classifier-versus-fallback precedence and the automatic pre-check inside
the other pipelines are not covered by dedicated tests.

## 13. Known limitations & open questions

- **Limitation:** the check only decides between upright and quarter turns. A photo that is tilted
  by a few degrees is not handled here; that is a straighten suggestion instead, described in
  [Image edit suggestions](04-image-edit-suggestions.md).
- **Limitation:** the face fallback needs face detection to have run first, so on a fresh library
  it usually has nothing to work with.
- **Limitation:** the settings that control this feature are all behind advanced settings, so a
  user who has hidden them cannot adjust the confidence threshold at all.
- **Limitation:** the model is fixed; unlike the vision model, there is no way to choose a
  different orientation model.
- **Open question:** the image analysis pipeline still contains an unused option for a second,
  rotation-consistency pass through the vision model. It defaults to on in settings but is never
  applied, and no screen exposes it.

## 14. References

- Module: [AI Image Analysis](README.md)
- [Wrongly rotated images review](../08-insights-and-library-health/03-wrongly-rotated-images-review.md) — where findings are acted on
- [AI image analysis](01-ai-image-analysis.md) — the pipeline this check runs ahead of
- [Image edit suggestions](04-image-edit-suggestions.md) — how a rotation finding is presented
