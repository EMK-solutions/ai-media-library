---
id: M-04
title: People & Faces
status: shipped
last_reviewed: 2026-08-26
---

# Module 04 — People & Faces

> Find every face in your photos, tell the app who those people are once, and let it propose the
> rest of their photos for you to confirm.

## 1. Purpose & value

This module turns a folder of anonymous photographs into a library organised around the people
in it. A local face detector finds the faces in every image and records where they are; the user
names the people who matter; and from a small number of hand-tagged examples the app proposes the
remaining photos of each person for confirmation. Nothing leaves the machine — detection and
recognition both run locally against models downloaded once to the app's model folder.

The value shows up outside this module far more than inside it. Person tags become people filters
in search and in the grid, "best of person" smart albums, per-person face counts in the folder
analysis dashboard, and face boxes with names in the viewer. The work the user invests here —
naming a handful of faces per person and confirming suggestions — is what makes those surfaces
useful, which is why the module is designed around a short, explicit teaching loop rather than a
one-shot automatic pass.

## 2. User stories

- **As a family archivist** I want the app to find all the faces in my photos, **so that** I do
  not have to look for them myself.
- **As a new user** I want to add the people who matter by name and tag a few of their faces,
  **so that** the app can find the rest of their photos for me.
- **As someone reviewing suggestions** I want to confirm or decline proposed matches in bulk,
  **so that** teaching the app costs minutes rather than hours.
- **As someone with thousands of unknown faces** I want unknown faces grouped by who they look
  like, **so that** I can name a whole group in one action instead of face by face.
- **As a curator** I want to keep the people list tidy — rename, pin the people I use most,
  record a birth date, delete someone — **so that** tagging stays fast as the list grows.
- **As someone building albums and searches** I want named sets of people, **so that** I can
  filter by "family" rather than by five individual names.

## 3. Feature index

| ID | Feature | Status | Primary screen | Doc |
|---|---|---|---|---|
| F-04-01 | Face detection | shipped | Folder ⋮ → Face detection | [01-face-detection.md](01-face-detection.md) |
| F-04-02 | Face recognition | shipped | People → Tagged faces (behind the scenes everywhere) | [02-face-recognition.md](02-face-recognition.md) |
| F-04-03 | Untagged face grouping | shipped | People → Untagged faces | [03-untagged-face-grouping.md](03-untagged-face-grouping.md) |
| F-04-04 | Person directory | shipped | People → People | [04-person-directory.md](04-person-directory.md) |
| F-04-05 | People groups | shipped | People → People groups | [05-people-groups.md](05-people-groups.md) |
| F-04-06 | Face tagging & suggestions | shipped | Viewer → Face tags tab; People → Tagged faces | [06-face-tagging-and-suggestions.md](06-face-tagging-and-suggestions.md) |

## 4. Key journeys

| ID | Journey | Path through the product |
|---|---|---|
| J-04-1 | Teach the app a person (the recommended order) | Detect faces → add the person by name → tag three to five clear faces → confirm suggested matches → repeat |
| J-04-2 | Name a whole group of unknown faces | Untagged faces → Find groups → pick a group → assign or create a person → accept rows |
| J-04-3 | Tag a face while looking at a photo | Viewer → Face tags tab → pick a person from the dropdown, or accept the proposed name |
| J-04-4 | Keep up after adding new photos | Re-run face detection in "only if missing" mode → return to Tagged faces → confirm the new suggestions |
| J-04-5 | Tidy the people list | People tab → rename, set a birth date, pin the frequently used, delete someone no longer needed |

### J-04-1 in full — the order that matters

This module owns **step 4 of the recommended setup path** in
[`../JOURNEYS.md`](../JOURNEYS.md) (J-X1), and the order inside it is deliberate:

1. **Run face detection** on the folder (folder ⋮ → **Face detection** → play). The same job also
   prepares each face for recognition, so nothing extra has to be started.
2. **Add the people who matter, by name**, on **People → People**. Start with the person who
   appears most often — every later step pays off fastest for them.
3. **Tag a handful of faces per person by hand**, from the viewer's **Face tags** tab. Aim for
   **at least three to five clearly visible faces per person**: the app builds each person's
   visual signature by averaging the faces already tagged for them, so a single blurry example
   produces poor proposals and a few good ones produce useful ones.
4. **Return to People → Tagged faces** and confirm or decline the proposed matches for that
   person. Every confirmation is added to the person's examples and the proposals are rebuilt, so
   the next round is better than the last.
5. **Use People → Untagged faces → Find groups** once the obvious people are known, and name
   whole groups of remaining unknown faces at once.
6. **Leave AI image analysis for last** — it is the slowest pipeline and none of the above depends
   on it. See [AI Image Analysis](../03-ai-image-analysis/README.md).

Running these steps out of order is not blocked, but it wastes effort: grouping before detection
has nothing to group, and confirming suggestions before any faces are tagged produces nothing to
confirm.

## 5. Entry points & navigation

| Entry point | Leads to | Notes |
|---|---|---|
| Sidebar **People** | The four-tab People workspace | Tabs, in order: People, People groups, Tagged faces, Untagged faces |
| Folder ⋮ / right-click → **Face detection** | Folder-wide detection job | Sub-options: **Include sub-folders**, **Override existing** |
| Viewer → **Face tags** tab | Per-face tagging for the open photo | Also holds **Detect faces - local** for a single image |
| Face card in Tagged faces or Untagged faces | The photo that face came from, opened in the viewer | Opens on the Face tags tab |
| Folder analysis summary → **Face detection** tab | Per-folder face counts, tagged counts and suggested matches | Owned by [M-08](../08-insights-and-library-health/README.md) |
| Help control (?) in any People tab | The People & faces slide deck | Opens at the slide matching the current tab |
| Settings → **Face detection** / **Face recognition** | Advanced thresholds and model choice | Both groups are marked advanced and hidden unless advanced settings are shown |

## 6. Key concepts

| Term | Meaning in this module |
|---|---|
| Face instance | One detected face in one photo, with its box and its own recognition data |
| Person (person tag) | A named individual; tagging attaches a face instance to them |
| Tagged face | A face instance the user has attached to a person |
| Untagged face | A detected face not yet attached to anyone |
| Visual signature | What the app stores per face so two faces can be compared for similarity |
| Person profile | The average of everything tagged for a person, used to score candidate faces |
| Suggested match / similar face | An untagged face scoring above the recognition threshold for a person |
| Face group | A cluster of untagged faces that resemble each other, offered for bulk naming |
| Main subject vs background face | Whether a face is large enough, relative to the biggest face and to the frame, to count as a subject of the photo |
| People group | A named set of people, used by filters and smart albums |

Full definitions: [`../GLOSSARY.md`](../GLOSSARY.md).

## 7. Dependencies

**Depends on**

| Module | What it needs |
|---|---|
| [M-02 Catalog & Metadata](../02-catalog-and-metadata/README.md) | A catalog row per image, with dimensions and orientation, before faces can be stored against it |
| [M-08 Insights & Library Health](../08-insights-and-library-health/README.md) | Wrong-rotation detection, which runs ahead of detection so sideways photos still get their faces found |
| [M-09 Background Processing](../09-background-processing/README.md) | The job queue, progress dock and cancellation for detection, grouping and count refreshes |
| [M-11 Settings & Configuration](../11-settings-and-configuration/README.md) | Detector choice, detection filters and recognition thresholds |
| [M-13 Platform & Distribution](../13-platform-and-distribution/README.md) | On-demand download of the local face models |

**Depended on by**

| Module | What it consumes |
|---|---|
| [M-01 Library Browsing & Media Viewer](../01-library-browsing-and-media-viewer/README.md) | Face boxes and names in the viewer, and the people quick filter |
| [M-05 Search & Discovery](../05-search-and-discovery/README.md) | People filters, and the option to include unconfirmed faces — see [Search filters & scope](../05-search-and-discovery/03-search-filters-and-scope.md) |
| [M-06 Albums](../06-albums/README.md) | "Best of person" and "best of group" smart albums |
| [M-08 Insights & Library Health](../08-insights-and-library-health/README.md) | Per-folder face, tagged-face and suggested-match statistics |

## 8. Settings owned

| Settings group (UI label) | Features affected |
|---|---|
| **Face detection** — detector model, keep tagged faces on re-detection, age & gender estimation and its display, minimum confidence, minimum face size, overlap merge, main-subject rules, tag-preservation overlap | F-04-01, F-04-06 |
| **Face recognition** — similarity threshold for suggesting a person, group similarity threshold, minimum faces in a group | F-04-02, F-04-03, F-04-06 |

Both groups are marked advanced in Settings and are hidden while advanced settings are collapsed.
Wrong-rotation detection is a separate group owned by
[M-08](../08-insights-and-library-health/README.md), even though it runs inside the face
detection job.

## 9. Quality snapshot

| Type | Coverage |
|---|---|
| E2E | `apps/desktop-media/tests/e2e/people-module.spec.ts` — People tab opens from the sidebar with the birth-date column, add-person row appears, People groups tab renders, help deck opens on the visual overview slide |
| E2E | `apps/desktop-media/tests/e2e/face-detection-yolo12s.spec.ts` — selecting a YOLO variant and detecting faces on real photos returns faces |
| E2E | `apps/desktop-media/tests/e2e/face-detection-aux-models.spec.ts` — landmarks, orientation and age/gender populate face records; the orientation pre-check is skipped when already done |
| E2E | `apps/desktop-media/tests/e2e/face-detection-bundled-embedding.spec.ts` — one folder job both detects faces and leaves them ready for recognition |
| E2E | `apps/desktop-media/tests/e2e/face-pipeline-person-search.spec.ts` — a tagged person becomes findable in search and in a "best of person" album |
| E2E | `apps/desktop-media/tests/e2e/unconfirmed-face-search.spec.ts` — the unconfirmed-faces toggle widens a person filter; the suggestion refresh channel returns a count |
| E2E | `apps/desktop-media/tests/e2e/rotated-face-similarity.spec.ts`, `rotation-crop-face-detection.spec.ts` — rotated originals still produce faces and proposals |
| E2E | `apps/desktop-media/tests/e2e/face-model-download-failure.spec.ts` — a failed detector or auxiliary model download surfaces in Background operations |
| E2E | `apps/desktop-media/tests/e2e/face-detection-perf-diagnostic.spec.ts` — per-image latency measurement on sample folders |
| Unit / integration | `apps/desktop-media/electron/native-face/` (decoding, non-maximum suppression, prior boxes, affine warp, landmark refiner, age/gender, subject role, model manager, provider policy), `electron/db/face-tags.test.ts`, `face-tags-assign-batch.test.ts`, `person-suggestions.test.ts`, `face-similar-counts-batch.test.ts`, `get-cluster-person-match-stats-batch.test.ts`, `src/renderer/actions/people-actions.test.ts`, `src/renderer/lib/face-clustering-auto.test.ts`, `tagged-faces-tab-visible-tags.test.ts`, `face-tag-select-options.test.ts`, `compare-person-tag-rows.test.ts`, `person-similar-untagged-display.test.ts`, `birth-date-input.test.ts`, `packages/shared-contracts/src/face-detection/`, `packages/media-metadata-core/src/person-age.test.ts` |

**Gaps:** most detection E2E specs skip unless local sample photos are present, so CI proves the
plumbing rather than detection quality. There is no automated coverage of the confirm/decline
loop in Tagged faces, of group assignment in Untagged faces, or of person deletion.

## 10. Known gaps & direction

- Declining a proposed match is not remembered. Unless the face had already been accepted, the
  decline only hides it for the current session, and the same face is proposed again after the
  next refresh.
- Birth dates can be recorded and hidden, but the app does not yet show a person's age at the
  time a photo was taken anywhere in the People screens, even though the calculation exists in
  shared code.
- The **Face box overlap merge ratio** setting is exposed with a default of 0.5 but the native
  detectors merge overlapping boxes using their own fixed rule, so changing it has no observable
  effect.
- Recognition thresholds are not consistent across surfaces: the People screens use the
  configured threshold (0.38), while the single-face proposal in the viewer and the raw
  similar-face search use their own built-in values.
- Person data lives per library; there is no merge action for two people who turn out to be the
  same person, and no way to split one person into two.
