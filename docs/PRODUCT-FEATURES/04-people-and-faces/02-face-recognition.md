---
id: F-04-02
module: 04-people-and-faces
title: Face recognition
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/electron/db/face-embeddings.ts
  - apps/desktop-media/electron/db/person-suggestions.ts
  - apps/desktop-media/electron/face-recognition-threshold.ts
  - apps/desktop-media/electron/ipc/face-embedding-handlers.ts
  - apps/desktop-media/src/shared/ipc.ts
related:
  - F-04-01
  - F-04-03
  - F-04-06
---

# Face recognition

> From a handful of faces you name yourself, the app works out which other faces in the library
> look like the same person.

## 1. Summary

Recognition is the engine behind everything the People screens propose. When a face is detected the
app also computes a compact visual signature for it — a numeric description of what that face looks
like, robust enough to survive a change of pose, lighting or haircut. When the user tags faces for a
person, the app averages those tagged faces into a single **profile** for that person, then scores
every untagged face in the library against it. Faces that score above the recognition threshold
become that person's suggested matches.

Nothing about this is automatic naming: the app never attaches a name on its own. It ranks
candidates and the user confirms or declines them, and each confirmation is folded back into the
person's profile so the next round is better. This is why the recommended order in
[`../JOURNEYS.md`](../JOURNEYS.md) (J-X1, step 4) asks for three to five clearly visible faces per
person before the first confirmation pass: the profile is an average, so a few good examples beat
one poor one, and quality compounds with every confirmation.

## 2. User stories

- **As someone who has named a few faces** I want the app to find the rest of that person's photos,
  **so that** I do not have to tag thousands of faces by hand.
- **As someone reviewing a person** I want to know how many similar faces are still waiting,
  **so that** I can judge whether it is worth another confirmation pass.
- **As someone whose suggestions look wrong** I want a way to rebuild a person's profile from what
  I have confirmed, **so that** I can recover after a bad tag.
- **As a precision-minded user** I want to control how alike two faces must be before a match is
  offered, **so that** I can trade fewer proposals for fewer mistakes.

## 3. Scope

**In scope**

- Computing and storing a visual signature per detected face
- Building and maintaining each person's profile from the faces tagged for them
- Scoring untagged faces against a person and the threshold that decides a match
- Generating and refreshing the per-person suggested matches
- The "Similar faces" count shown per person, cached and live
- When each of the above is recomputed

**Out of scope**

- Finding faces in the first place — see [Face detection](01-face-detection.md)
- Grouping unknown faces with each other — see [Untagged face grouping](03-untagged-face-grouping.md)
- The confirm/decline interface — see [Face tagging & suggestions](06-face-tagging-and-suggestions.md)
- Using unconfirmed matches in search — see
  [Search filters & scope](../05-search-and-discovery/03-search-filters-and-scope.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Downloading the recognition model | [Face detection](01-face-detection.md) and [Platform & Distribution](../13-platform-and-distribution/README.md) |
| Progress and cancellation of the count refresh job | [Background Processing](../09-background-processing/README.md) |
| Person creation, renaming and deletion | [Person directory](04-person-directory.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-04-02.1 | Per-face visual signature | Every detected face becomes comparable to every other | shipped |
| F-04-02.2 | Person profile | An average of everything tagged for a person, used to score candidates | shipped |
| F-04-02.3 | Suggested matches per person | The list of untagged faces the app believes belong to that person | shipped |
| F-04-02.4 | Per-photo suggestion records | One best-scoring candidate face per photo per person, used by search | shipped |
| F-04-02.5 | Similar faces count | A per-person count of waiting candidates, cached and refreshable live | shipped |
| F-04-02.6 | Recalculate profile | A manual rebuild of one person's profile from their confirmed faces | shipped |
| F-04-02.7 | Rotation-aware signatures | Faces from rotated originals are compared on their corrected form | shipped |

## 5. User journeys

### J-04-02-1 — Teach the app one person

**Trigger:** the user has run face detection and wants a specific person recognised.
**Preconditions:** the person exists in the People tab; the recognition model is present.

1. The user tags three to five clearly visible faces of that person, from the viewer's **Face tags**
   tab.
2. After each tag the app rebuilds that person's profile from every face now tagged for them, and —
   while the person still has fewer than 20 tagged faces — rescans untagged faces to refresh their
   suggested matches.
3. The user opens **People → Tagged faces**, selects the person, and sees the proposals under
   **Auto-detected matching faces**, each labelled with its similarity as a percentage.
4. Confirming a row attaches those faces to the person, which again rebuilds the profile and the
   proposals.
5. The user repeats until the proposals stop containing the right person.

**Outcome:** the person is recognised across the library, and their photos are reachable through
people filters, smart albums and search.

**Alternate paths**

- The person passes 20 tagged faces → the automatic rescan after each new tag stops, because the
  profile has stabilised. Proposals are still rebuilt at the end of a detection run, when moving
  through the pages of the proposal list, and by **Recalculate profile**.
- The user starts from a face group instead → see
  [Untagged face grouping](03-untagged-face-grouping.md); assigning a group has the same effect on
  the profile as tagging the faces individually.

**Failure paths**

- No faces are tagged for the person yet → they have no profile, no proposals, and a "Similar
  faces" count of zero.
- Faces exist but their signatures were never computed → the Tagged faces header offers a
  **Generate embeddings** action with the number outstanding, and proposals stay empty until it has
  run.

### J-04-02-2 — Check how much work is left per person

**Trigger:** the user opens **People → People**.

1. The list shows, per person, the number of **Tagged faces** and the number of **Similar faces**
   still waiting.
2. On first load the Similar faces column shows the cached count stored with each person.
3. Pressing refresh recomputes the count live for the ten people on the current page, with a
   spinner in the column header and progress reported in the **People tab: similar face counts**
   card in the progress dock.

**Outcome:** the user can pick the person with the most outstanding candidates and work on them
first.

**Alternate paths**

- The live job is cancelled or fails → the column falls back to each person's cached count rather
  than showing nothing.

### J-04-02-3 — Recover from a bad tag

**Trigger:** proposals for a person have become obviously wrong.

1. The user removes the offending tagged faces (from Tagged faces or from the viewer).
2. Each removal rebuilds that person's profile and refreshes their proposals.
3. If proposals still look wrong, the user presses **Recalculate profile** in the Tagged faces
   header, which rebuilds the profile from every face currently tagged for the person and reloads
   the list.

**Outcome:** the person's proposals reflect only the faces the user stands behind.

## 6. Screens & UX

Recognition has almost no surface of its own; it shows up as numbers and lists inside other
screens.

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| People list, **Similar faces** column | Sidebar People → People | Cached or live count per person, spinner while recomputing | `apps/desktop-media/src/renderer/components/DesktopPeopleTagsListTab.tsx` |
| **Auto-detected matching faces** | People → Tagged faces, select a person | Rows of five candidate faces, each with a similarity percentage; per-row accept and hide | `apps/desktop-media/src/renderer/components/DesktopPeopleWorkspace.tsx` |
| **Recalculate profile** / **Generate embeddings** | Tagged faces header, when a person is selected or signatures are outstanding | Two buttons with explanatory tooltips | same |
| Suggestion row on a face card | Viewer → Face tags tab, for an untagged face | Proposed person name with its score and a one-click assign | `packages/media-viewer/src/face-tags-entry-card.tsx` |
| Settings → **Face recognition** | Settings, with advanced settings shown | Three numeric fields and a reset control | `apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx` |
| **People tab: similar face counts** card | Progress dock, while a live count job runs | Progress and cancel | `apps/desktop-media/src/renderer/components/progress-dock/` |

**States**

| State | What the user sees |
|---|---|
| Person has no tagged faces | Empty proposals, "Similar faces" of zero |
| Signatures outstanding | **Generate embeddings (N)** in the Tagged faces header |
| Counts recomputing | Spinner in the Similar faces header, progress card in the dock |
| No candidates above the threshold | "Select a person tag to see related faces." remains, with an empty proposal area |

**UX notes**

- Similarity is always shown to the user as a percentage, never as a raw score, and always next to
  the face it belongs to.
- The Similar faces column deliberately prefers a stale cached number over a blank cell, so the
  list is never empty while a recount runs.
- Live recounting is scoped to the visible page of ten people, because the count is a full-library
  scan per person.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Every detected face with a usable crop gets a visual signature, computed locally by the bundled recognition model. | Without it a face cannot be compared to anyone. | `apps/desktop-media/electron/face-embedding.ts`, `electron/native-face/arcface-embedder.ts` |
| BR-2 | A person's profile is the average of **all** faces currently tagged for them — there is no sample cap. | Every confirmation the user makes counts. | `apps/desktop-media/electron/db/face-embeddings.ts` |
| BR-3 | An untagged face is a candidate for a person when its similarity to that person's profile is at least **Similarity threshold for suggesting a person** (default 0.38). | One user-facing dial for precision versus recall. | `apps/desktop-media/electron/face-recognition-threshold.ts` |
| BR-4 | Faces already tagged for the person are excluded from that person's candidates. | Nothing already confirmed should be proposed again. | `apps/desktop-media/electron/db/face-embeddings.ts` |
| BR-5 | For search, at most one candidate per photo per person is recorded — the best-scoring face in that photo. | Search filters on photos, not on faces. | `apps/desktop-media/electron/db/person-suggestions.ts` |
| BR-6 | A suggestion refresh for one person evaluates at most 50,000 untagged faces. | Bounds the time a refresh can take on a very large library. | `apps/desktop-media/electron/db/person-suggestions.ts` |
| BR-7 | Tagging or untagging a face rebuilds that person's profile immediately, and clears the photo's pending suggestion for them. | The list the user is looking at stays truthful. | `apps/desktop-media/electron/ipc/face-tags-handlers.ts` |
| BR-8 | After a tag assignment, the full rescan of untagged faces runs only while the person has fewer than 20 tagged faces. | A full rescan per tag is expensive, and the profile barely moves once it is well established. | `apps/desktop-media/electron/person-suggestion-refresh-policy.ts` |
| BR-9 | At the end of a face detection run that prepared at least one face, suggestions are rebuilt for every person. | New photos of known people appear without any manual action. | `apps/desktop-media/electron/face-embedding-suggestions-sync.ts` |
| BR-10 | Paging through a person's proposal list triggers a refresh of that person's suggestions. | Keeps a long review session from working against stale data. | `apps/desktop-media/src/renderer/components/DesktopPeopleWorkspace.tsx` |
| BR-11 | Each person's "Similar faces" count is cached alongside their profile and updated whenever their suggestions are refreshed; the live job recomputes it only for the people visible on the current page. | A count is a full-library scan; caching keeps the list instant. | `apps/desktop-media/electron/db/face-tags.ts`, `electron/db/face-similar-counts-batch.ts` |
| BR-12 | When a photo has a known rotation correction, its faces are compared using the corrected image. | A sideways photo would otherwise never match an upright one. | `apps/desktop-media/electron/ipc/face-detection-handlers.ts` |
| BR-13 | Deleting a person removes their profile and all their pending suggestions. | No orphaned proposals for someone who no longer exists. | `apps/desktop-media/electron/db/face-tags.ts` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| Similarity threshold for suggesting a person | 0.38 | How alike an untagged face must be to a person before it is proposed. Lower shows more proposals, higher is stricter (BR-3) | Yes |
| How similar two faces must look to join the same group | 0.55 | Used by grouping, not by per-person matching — see [Untagged face grouping](03-untagged-face-grouping.md) | Yes |
| Minimum faces in a suggested group | 4 | Used by grouping — see [Untagged face grouping](03-untagged-face-grouping.md) | Yes |

Defined in `apps/desktop-media/src/shared/ipc.ts` (`DEFAULT_FACE_DETECTION_SETTINGS`) and surfaced
in Settings → **Face recognition**, which is marked advanced and has its own reset control.

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Per-face visual signature and its status | `media_face_instances` (stored as a 512-value face embedding) | Whether a face can participate in matching at all |
| Person profile, plus the cached count of waiting similar faces | `person_centroids` | Drives proposals and the "Similar faces" column |
| Best candidate face per photo per person | `media_item_person_suggestions` | The "include unconfirmed faces" option in search |
| The recognition model file | The app's model folder | Downloaded once; recognition is unavailable until it is present |

All of it is library data, not file data: nothing is written into the photos, and removing a
library root discards it without touching the images.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| The recognition model | Signatures, profiles, proposals | Proposals stay empty; the Tagged faces header offers **Generate embeddings** but it cannot complete |
| [Face detection](01-face-detection.md) | Faces to compare | Nothing to recognise |
| At least one tagged face per person | A profile for that person | No proposals and a zero count for that person |
| Wrong-rotation detection | Comparable faces from sideways photos | Rotated photos match poorly |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `media:embed-folder-faces` | `folderPath`, `recursive` | Prepare a folder's faces for recognition on their own |
| `media:cancel-face-embedding` / `media:face-embedding-progress` | — / push event | Cancel and observe that job |
| `media:get-embedding-model-status` | — | Whether the recognition model is loaded |
| `media:get-embedding-stats` | — | Total faces, faces ready, faces outstanding |
| `media:reprocess-face-crops-embeddings` | — | Prepare every face that is still missing a signature |
| `media:find-person-matches` | `tagId`, `threshold`, `limit` (`0` for all) | The candidate faces for one person |
| `media:suggest-person-tag-for-face` | `faceInstanceId`, `threshold` | The best person for one untagged face |
| `media:search-similar-faces` | query face, `threshold`, `limit` | Faces most like a given face |
| `media:get-face-to-person-centroid-similarities` | `faceIds`, `tagId` | Scores for a batch of faces against one person |
| `media:refresh-person-suggestions-for-tag` / `media:refresh-person-suggestions` | `tagId` / — | Rebuild suggestions for one person or all |
| `media:recompute-person-centroid` | `tagId` | Rebuild one person's profile |
| `media:get-similar-untagged-face-counts-for-tags` | `tagIds`, `threshold` | Counts for a batch of people |
| `media:start-similar-untagged-face-counts-job` / `media:cancel-similar-untagged-face-counts-job` / `media:similar-untagged-counts-progress` | `tagIds`, `threshold` / `jobId` / push event | The cancellable live recount behind the People list |

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/face-pipeline-person-search.spec.ts` | A detection run prepares faces, and a tagged person becomes findable in search and in a "best of person" album |
| E2E | `apps/desktop-media/tests/e2e/unconfirmed-face-search.spec.ts` | The unconfirmed-faces toggle widens a person filter; the suggestion refresh channel returns a count |
| E2E | `apps/desktop-media/tests/e2e/rotated-face-similarity.spec.ts` | Rotated and upright photos of the same group both produce a person proposal in the Face tags tab |
| E2E | `apps/desktop-media/tests/e2e/face-detection-bundled-embedding.spec.ts` | A folder detection run leaves faces ready for recognition |
| Unit | `apps/desktop-media/electron/db/person-suggestions.test.ts` | Suggestion refresh: threshold filtering, one row per photo, cleanup when a profile disappears |
| Unit | `apps/desktop-media/electron/db/face-similar-counts-batch.test.ts` | Batched per-person counts matching the per-person definition |
| Unit | `apps/desktop-media/electron/face-embedding-rotation.test.ts`, `face-embedding-target.test.ts` | Which image and which crop a face's signature is computed from |
| Unit | `apps/desktop-media/src/renderer/lib/person-similar-untagged-display.test.ts` | Cached versus live versus loading state of the Similar faces column |

**Coverage gaps:** the 20-tagged-face cut-off for automatic rescans (BR-8), the 50,000-face refresh
cap (BR-6) and **Recalculate profile** have no dedicated automated coverage.

## 13. Known limitations & open questions

- **Limitation:** the configured threshold is not used everywhere. The People screens pass the
  setting (0.38), but the single-face proposal shown in the viewer falls back to a built-in 0.48,
  and the raw similar-face search falls back to 0.6. Changing the setting therefore does not change
  the viewer's proposals.
- **Limitation:** declining a proposal is not recorded, so a face the user rejected can be proposed
  again after the next refresh. Only confirmations feed back into recognition.
- **Limitation:** there is no per-person threshold. A person with few or unusual photos has to share
  the library-wide setting with everyone else.
- **Limitation:** recognition never merges two people, so if the same person was created twice the
  two profiles compete rather than combine.
- **Open question:** whether the automatic rescan cut-off should be a setting rather than a fixed
  20 tagged faces, since users with very large libraries may want it lower and users with small
  libraries higher.

## 14. References

- Module: [People & Faces](README.md)
- [Face detection](01-face-detection.md) — where the faces and signatures come from
- [Face tagging & suggestions](06-face-tagging-and-suggestions.md) — confirming and declining
- [Untagged face grouping](03-untagged-face-grouping.md) — the same signatures used to group unknowns
- [Search filters & scope](../05-search-and-discovery/03-search-filters-and-scope.md) — unconfirmed faces in search
- Recommended setup order: [`../JOURNEYS.md`](../JOURNEYS.md) J-X1, step 4
