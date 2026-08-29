---
id: F-04-01
module: 04-people-and-faces
title: Face detection
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/electron/native-face/
  - apps/desktop-media/electron/pipelines/definitions/face-detection.ts
  - apps/desktop-media/electron/ipc/face-detection-handlers.ts
  - apps/desktop-media/electron/db/media-analysis.ts
  - apps/desktop-media/src/shared/ipc.ts
related:
  - F-04-02
  - F-04-06
---

# Face detection

> Run one job over a folder and the app records where every face is, ready to be named.

## 1. Summary

Face detection is the first step of the People workflow and the only one that touches every image.
The user starts it per folder, and the app opens each photo, finds the faces in it, and stores one
record per face with its position, its confidence, whether it looks like a subject of the photo or
an incidental bystander, and — with the shipped defaults — refined eye/nose/mouth landmarks plus an
estimated age and gender. The same job also prepares each face for recognition, so the user never
has to start a second pipeline before naming people.

Everything runs locally and inside the app process: the models are ONNX files downloaded once from
public model hosts into the app's model folder, and no image data leaves the machine. Detection is
a per-folder action rather than a background watcher, so the user chooses when the machine does the
work, can include sub-folders, can re-run only what is missing, and can cancel at any point.

## 2. User stories

- **As someone with a folder of family photos** I want the app to find all the faces in it,
  **so that** I can start naming people instead of hunting through images.
- **As someone re-running detection after changing a setting** I want the faces I already named to
  survive, **so that** improving detection does not undo my tagging work.
- **As someone with a large archive** I want to run detection folder by folder and cancel it,
  **so that** it fits around how I use the machine.
- **As someone looking at one photo** I want to re-run detection on just that image, **so that** a
  missed face can be recovered without reprocessing the folder.

This feature is not where faces get names. Naming is
[Face tagging & suggestions](06-face-tagging-and-suggestions.md).

## 3. Scope

**In scope**

- Choosing the detector model and downloading its weights on demand
- The folder-level detection job: scope, re-run mode, progress, cancellation, failures
- Single-image detection from the viewer
- Filters that decide which detected faces are kept
- Main-subject versus background-face classification
- Preserving already-tagged faces when detection runs again
- Optional per-face age and gender estimation

**Out of scope**

- Deciding which known person a face resembles — see [Face recognition](02-face-recognition.md)
- Grouping unknown faces — see [Untagged face grouping](03-untagged-face-grouping.md)
- Assigning a person to a face — see [Face tagging & suggestions](06-face-tagging-and-suggestions.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Catalog rows, dimensions and orientation the job depends on | [Folder scan](../02-catalog-and-metadata/README.md) |
| Detecting and reviewing wrongly rotated photos | [Wrongly rotated images review](../08-insights-and-library-health/03-wrongly-rotated-images-review.md) |
| Queueing, progress dock and cancellation UI | [Background Processing](../09-background-processing/README.md) |
| Per-folder face statistics | [Folder analysis dashboard](../08-insights-and-library-health/README.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-04-01.1 | Folder detection run | Faces found across a folder, optionally including sub-folders, with progress and cancel | shipped |
| F-04-01.2 | Detector model choice | Five local models trading speed against accuracy, downloaded on first use | shipped |
| F-04-01.3 | Face quality filters | Weak and tiny detections dropped so the People screens stay usable | shipped |
| F-04-01.4 | Main subject classification | Faces marked as subjects or background, which drives "images with N people" filters | shipped |
| F-04-01.5 | Tag-preserving re-detection | Named faces survive a re-run or a detector change | shipped |
| F-04-01.6 | Age & gender estimation | An approximate age and gender per face, optionally shown in the viewer | shipped |
| F-04-01.7 | Single-image detection | **Detect faces - local** re-runs detection for the open photo | shipped |
| F-04-01.8 | Recognition hand-off | Each detected face is prepared for recognition inside the same job | shipped |

## 5. User journeys

### J-04-01-1 — Detect faces in a folder

**Trigger:** the user opens a folder's ⋮ menu and expands **Face detection**.
**Preconditions:** the folder has been scanned so its images are in the catalog; the detector model
is present or can be downloaded.

1. The user ticks **Include sub-folders** if the tree is nested, leaves **Override existing**
   unticked to process only images not yet detected, and presses play.
2. If the selected model is not on disk, it is downloaded first and the progress appears in
   Background operations.
3. The job reports progress per image in the **Local face detection** panel of the progress dock,
   counting faces as it goes.
4. Each image is checked for wrong rotation first; when a correction angle is known, detection runs
   on a corrected copy and the face boxes are mapped back onto the original.
5. Faces are stored for the image, and every face with a usable crop is immediately prepared for
   recognition.
6. When the run ends, the app rebuilds the suggested matches for every person, so the People
   screens are up to date without further action.

**Outcome:** the folder's faces are recorded and ready to be named.

**Alternate paths**

- **Override existing** ticked → every image is processed again, including ones already detected.
- The user presses cancel → the current image finishes, the remainder is reported as cancelled, and
  already-processed images keep their faces.
- Faces exist whose recognition data is missing from an earlier interrupted run → a catch-up pass
  at the end of the job prepares them.

**Failure paths**

- The model cannot be downloaded → the job stops with a message that the face detection service is
  unavailable and that ONNX models must be downloaded; the download failure is reported in
  Background operations.
- One image fails (unreadable file, decode error) → that image is marked as failed with its error
  and the job continues. A later run in **only if missing** mode can be told to skip previously
  failed files.

### J-04-01-2 — Recover a face the folder run missed

**Trigger:** the user is looking at a photo, opens the info panel's **Face tags** tab, and sees no
faces or a missing one.

1. The user presses **Detect faces - local**.
2. Detection runs for that single image with the current settings.
3. The face list and the boxes drawn over the photo are refreshed in place.

**Outcome:** the photo's faces are corrected without touching the rest of the folder.

**Alternate paths**

- The image already has tagged faces → those are preserved according to the overlap rule below.

### J-04-01-3 — Change the detector and re-run

**Trigger:** the user picks a different model in Settings → **Face detection**.

1. Selecting a model immediately starts its download if it is not already present.
2. The user re-runs detection on a folder with **Override existing** ticked.
3. Faces already tagged with a person are matched against the new detections and kept.

**Outcome:** better detections without losing named faces.

**Failure paths**

- The new model's download fails → the failure appears in Background operations and detection
  refuses to start until a model is available.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Folder **Face detection** menu row | Folder ⋮ or right-click in the sidebar, or the toolbar folder menu | Expandable row with **Include sub-folders**, **Override existing**, and a play/cancel control | `apps/desktop-media/src/renderer/components/FolderAnalysisMenuSection.tsx` |
| **Local face detection** progress card | Appears in the progress dock while a run is active | Per-image progress, faces found, time left, cancel | `apps/desktop-media/src/renderer/components/progress-dock/` |
| Settings → **Face detection** | Settings, with advanced settings shown | Model picker with size and description, tag-preservation options, age/gender toggle, numeric filters, reset to defaults | `apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx` |
| Viewer → **Face tags** tab | Open a photo, open the info panel, choose Face tags | One card per face with its crop, plus **Detect faces - local** | `apps/desktop-media/src/renderer/components/DesktopFaceTagsTabContent.tsx` |
| Face boxes over the photo | Automatically while the Face tags tab is open | Rectangles per face, highlighted when its card is selected | `packages/media-viewer/src/face-bounding-box-overlay.tsx` |

**States**

| State | What the user sees |
|---|---|
| No faces yet for an image | "No faces detected for this media item yet." with a hint to run face detection |
| Model downloading | A download entry in Background operations; detection waits |
| Running | "Face detection in progress..." with per-image counts in the dock |
| Restarting | "Face detection service is restarting — retrying failed images automatically…" |
| Unavailable | "Face detection service is unavailable." |
| Finished | "Face detection finished." and the folder's face counts update |

**UX notes**

- The detection settings group is marked advanced and stays hidden while advanced settings are
  collapsed, so a normal user never has to choose a model or a threshold.
- Face detection is one queue entry, not two: preparing faces for recognition happens inside it, so
  the user is never asked to run a second job before naming people.
- Cancellation is honoured between images, so a cancel is immediate from the user's point of view
  but never leaves an image half-stored.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | A detected face is discarded when its confidence is below **Minimum confidence threshold** (default 0.75). | Patterns that merely look like faces would otherwise fill the People screens. | `apps/desktop-media/electron/native-face/` |
| BR-2 | A detected face is discarded when its shorter side is under **Minimum face box short-side ratio** (default 0.03) of the image. | Very small faces cannot be tagged or matched reliably. | `apps/desktop-media/electron/native-face/` |
| BR-3 | A face counts as a **main subject** only when its short side is at least 0.5 of the largest face in the photo *and* its box covers at least 0.01 of the image area. | Keeps "images with two people" style filters from counting bystanders in a crowd. | `apps/desktop-media/electron/native-face/subject-role.ts` |
| BR-4 | When detection runs again on an image, an existing tagged face is kept if a new detection overlaps it by at least **Preserve person tags on re-detection: min IoU** (default 0.5). | The user's naming work must outlive a re-run. | `apps/desktop-media/electron/db/media-analysis.ts` |
| BR-5 | When no new detection overlaps a tagged face, it is still kept as long as **Keep tagged faces even when the new detector misses them** is on (default on). | A detector change must not make named people disappear. | `apps/desktop-media/electron/db/media-analysis.ts` |
| BR-6 | In **only if missing** mode, images already carrying a detection result are skipped; in **Override existing** mode every image is processed. | Repeat runs after adding files stay cheap. | `apps/desktop-media/electron/pipelines/definitions/face-detection.ts` |
| BR-7 | Wrong-rotation detection runs before detection on each image; when a correction angle is known, faces are detected on a rotated copy and the boxes are converted back to the original image's coordinates. | Sideways photos otherwise yield no faces at all. | `apps/desktop-media/electron/ipc/face-detection-handlers.ts` |
| BR-8 | Detection is single-pass: the app does not try extra quarter-turns when a photo yields no faces. | Predictable, bounded time per image. | `apps/desktop-media/electron/ipc/face-detection-handlers.ts` |
| BR-9 | An image that fails is recorded with its error and does not stop the run; a later run can be told to skip files that failed before. | One corrupt file must not cost a whole folder. | `apps/desktop-media/electron/pipelines/definitions/face-detection.ts` |
| BR-10 | Every face detected in the run is prepared for recognition in the same job, and any face left without recognition data is caught up at the end of the run. | The user should never have to know a second step exists. | `apps/desktop-media/electron/pipelines/definitions/face-detection.ts` |
| BR-11 | When the run has prepared at least one face, the suggested matches for all people are rebuilt before the job reports completion. | New photos of known people appear as proposals without a manual refresh. | `apps/desktop-media/electron/face-embedding-suggestions-sync.ts` |
| BR-12 | Detection runs in the shared GPU concurrency group, so it does not run at the same time as the other model-heavy pipelines. | Avoids starving image analysis and search indexing of the same device. | `apps/desktop-media/electron/pipelines/definitions/face-detection.ts` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| Face detection model | YOLOv12 Large (~102 MB) | Which local detector is used. Options: RetinaFace (MobileNetV2) ~7 MB, YOLOv12 Nano ~11 MB, YOLOv12 Small ~38 MB, YOLOv12 Medium ~79 MB, YOLOv12 Large ~102 MB | Yes |
| Keep tagged faces even when the new detector misses them | On | Named faces survive a detector change (BR-5) | Yes |
| Face age & gender estimation | On, model "Age + Gender (ViT)" (~90 MB) | Stores an approximate age and gender per face | Yes |
| Show AI age and gender in Face tags panel | Off | Adds a line such as "AI age: 45, Male (67%)" to each face card in the viewer | Yes |
| Minimum confidence threshold | 0.75 | Drops weak detections (BR-1) | Yes |
| Minimum face box short-side ratio | 0.03 | Drops tiny faces (BR-2) | Yes |
| Face box overlap merge ratio | 0.5 | Intended to merge heavily overlapping boxes; see Known limitations | Yes |
| Main subject: min face size ratio vs. largest face | 0.5 | Part of the main-subject test (BR-3) | Yes |
| Main subject: min area fraction of the image | 0.01 | Part of the main-subject test (BR-3) | Yes |
| Preserve person tags on re-detection: min IoU | 0.5 | Overlap needed to carry a person tag onto a new detection (BR-4) | Yes |

Defined in `apps/desktop-media/src/shared/ipc.ts` (`DEFAULT_FACE_DETECTION_SETTINGS`) and surfaced
in Settings → **Face detection**, with a **Reset to defaults** control for the group.

Two more models are used by the job without a visible control of their own: the landmark refiner
"PFLD GhostOne (98-point landmarks)" (~3 MB) is enabled by default but its Settings toggle is
switched off in code, and the orientation classifier "Deep Image Orientation (EfficientNetV2)"
(~80 MB) is configured here while its enable switch lives in
[Wrong image rotation detection](../08-insights-and-library-health/03-wrongly-rotated-images-review.md).

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| One record per detected face: box, confidence, subject role, landmarks, age and gender estimates | `media_face_instances` | The boxes in the viewer, the cards in the People screens; survives restart |
| Whether an image has been face-detected, and any failure message | The image's catalog row | Drives "only if missing" runs and the folder analysis dashboard |
| Detected orientation used for the run | The image's orientation state | Explains why boxes line up on a rotated original |
| A per-face visual signature | `media_face_instances` | Makes the face comparable to people — see [Face recognition](02-face-recognition.md) |
| Downloaded ONNX model files | The app's model folder | Downloaded once; deleting them forces a re-download on the next run |

Face records belong to the library, not to the file: they are not written into the photo's embedded
metadata, and removing a library root removes the app's knowledge of those faces without touching
the images.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| The detector ONNX model | Any detection at all | Detection refuses to start with a message that models must be downloaded |
| Internet access on first use of a model | Downloading weights | A download failure entry in Background operations |
| A catalog row per image | Storing faces against the image | The job creates the missing catalog rows itself before detecting |
| Wrong-rotation detection | Finding faces in sideways photos | Detection still runs, but rotated photos may yield no faces |
| The recognition model | Preparing faces inside the same job | Faces are still detected; they cannot be matched to people until the model is present |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `media:detect-folder-faces` | `folderPath`, `recursive`, `mode` (`missing` \| `all`) | Start a folder detection run |
| `media:cancel-face-detection` | — | Cancel the active run |
| `media:face-detection-progress` | push event | Per-image progress, counts, completion |
| `media:detect-faces-for-media-item` | `sourcePath`, detection settings | Detect faces for a single image |
| `media:get-face-detection-service-status` | — | Whether detection is ready to run |
| `media:ensure-detector-model` | `detectorModel` | Make sure a detector's weights are on disk |
| `media:ensure-aux-model` | `kind`, `modelId` | Make sure an orientation, landmark or age/gender model is on disk |
| `media:face-model-download-progress` | push event | Download progress and failures for any face model |
| `media:list-face-instances-for-media-item` | `mediaItemId` | Read back the faces of one image |
| `media:delete-face-instance` | `faceInstanceId` | Remove a spurious face record |

Detection is also reachable as the `face-detection` pipeline through the shared folder pipeline
queue (`apps/desktop-media/src/renderer/lib/enqueue-folder-ai-pipeline.ts`), which is what the
folder menu uses.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/face-detection-yolo12s.spec.ts` | Selecting YOLOv12 Small and detecting faces on real photos |
| E2E | `apps/desktop-media/tests/e2e/face-detection-aux-models.spec.ts` | Landmarks, orientation and age/gender populating face records; the orientation pre-check being skipped when already done |
| E2E | `apps/desktop-media/tests/e2e/face-detection-bundled-embedding.spec.ts` | One folder job both detecting faces and leaving them ready for recognition |
| E2E | `apps/desktop-media/tests/e2e/rotation-crop-face-detection.spec.ts` | Rotated originals still producing faces after the orientation pre-check |
| E2E | `apps/desktop-media/tests/e2e/face-model-download-failure.spec.ts` | Detector and auxiliary model download failures surfacing in Background operations |
| E2E | `apps/desktop-media/tests/e2e/face-detection-perf-diagnostic.spec.ts` | Per-image latency measurement on sample folders |
| E2E | `apps/desktop-media/tests/e2e/viewer-face-tags-overlay-regression.spec.ts` | Face boxes clearing when moving to an image with no faces |
| Unit | `apps/desktop-media/electron/native-face/subject-role.test.ts` | Main-subject versus background classification |
| Unit | `apps/desktop-media/electron/native-face/nms.test.ts`, `decode.test.ts`, `yolo-output-decode.test.ts`, `prior-box.test.ts` | Turning raw model output into face boxes |
| Unit | `apps/desktop-media/electron/native-face/landmark-refiner.test.ts`, `age-gender-estimator.test.ts`, `affine-warp.test.ts`, `image-utils.test.ts`, `model-manager.test.ts`, `onnx-provider-policy.test.ts` | The auxiliary per-face steps, model files, and execution provider selection |
| Unit | `apps/desktop-media/electron/db/face-bbox-reference-dimensions.test.ts` | Face boxes staying correct against the image they were measured on |
| Unit | `packages/shared-contracts/src/face-detection/bounding-box.test.ts`, `iou.test.ts`, `rotation-heuristics.test.ts` | Box normalisation, overlap maths and orientation estimates from landmarks |
| Integration | `apps/desktop-media/electron/native-face/native-face-detection.integration.test.ts`, `native-face-real-image.integration.test.ts`, `native-face-gpu.machine.integration.test.ts` | End-to-end detection against real models and images |

**Coverage gaps:** the detection E2E specs skip unless local sample photos are present, so CI
proves the wiring rather than detection quality. Tag-preserving re-detection (BR-4, BR-5) and the
"only if missing" versus "override" behaviour have no dedicated automated coverage.

## 13. Known limitations & open questions

- **Limitation:** the **Face box overlap merge ratio** setting (default 0.5) is stored and shown,
  but the native detectors merge overlapping boxes with their own fixed rule, so changing it has no
  observable effect.
- **Limitation:** the model picker's help text still describes RetinaFace as "the stable default"
  although the shipped default is YOLOv12 Large, and one failure message still refers to a
  "RetinaFace API running locally" from an earlier architecture where detection was a separate
  service. Both are stale copy rather than behaviour.
- **Limitation:** the landmark refinement toggle is intentionally hidden in Settings even though
  refinement is on by default, so a user cannot turn it off from the UI.
- **Limitation:** detection is per-folder and manual; adding files to a folder does not schedule
  detection for them.
- **Open question:** whether the extra orientation retry passes, which exist in code but are
  switched off for every caller, should ever be exposed as a "try harder on photos with no faces"
  option.

## 14. References

- Module: [People & Faces](README.md)
- [Face recognition](02-face-recognition.md) — what happens to each face after it is found
- [Face tagging & suggestions](06-face-tagging-and-suggestions.md) — naming faces
- Recommended setup order: [`../JOURNEYS.md`](../JOURNEYS.md) J-X1, step 4
- Implementation history: `docs/IMPLEMENTATION-LOG/features/2026-03_face_detection_ux_improvements_*.plan.md`,
  `docs/IMPLEMENTATION-LOG/features/2026-03_face_orientation_metadata_*.plan.md`
