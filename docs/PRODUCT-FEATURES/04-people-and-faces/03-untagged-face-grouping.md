---
id: F-04-03
module: 04-people-and-faces
title: Untagged face grouping
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/electron/face-clustering.ts
  - apps/desktop-media/src/renderer/components/DesktopFaceClusterGrid.tsx
  - apps/desktop-media/src/renderer/lib/face-clustering-auto.ts
  - packages/media-store/src/slices/face-clustering.ts
related:
  - F-04-02
  - F-04-06
---

# Untagged face grouping

> Let the app collect the unknown faces that look like each other, so a whole group can be named at
> once instead of face by face.

## 1. Summary

After face detection a library typically holds far more unknown faces than the user is willing to
tag one at a time. **People → Untagged faces** solves that by grouping the untagged faces that look
like each other into draft groups. Each group is presented with a representative face, a member
count and — when the app can guess — a suggested person. The user picks a target person for the
group, then accepts faces a row at a time, which tags five faces per click.

Grouping is deliberately not naming: the app has no idea who these people are, only that a set of
faces resembles each other. Groups are also throwaway. They are rebuilt from scratch each time
**Find groups** runs, so a group that turned out to mix two people simply disappears at the next
run. The right moment to use this screen is after the obvious people have been taught individually,
because the app can then propose a name for many groups instead of leaving them all anonymous.

## 2. User stories

- **As someone facing thousands of unknown faces** I want them collected by who they look like,
  **so that** I can name many at once.
- **As someone naming a group** I want the app to guess who it is, **so that** I only have to
  confirm rather than search a long list of people.
- **As a careful tagger** I want to see how strongly each face in a group matches the person I chose,
  **so that** I can accept the confident ones and leave the doubtful ones alone.
- **As someone with a small library** I want the grouping to have happened already when I open the
  tab, **so that** there is something to work with immediately.

## 3. Scope

**In scope**

- The **Find groups** run: what it groups, progress, cancellation
- Automatic grouping on first visit for small libraries
- The Untagged faces screen: group list, group expansion, member paging
- Choosing or creating the person a group is being tagged as
- Accepting and hiding faces inside a group
- The per-person similarity bands used to filter a group's members

**Out of scope**

- Finding faces — see [Face detection](01-face-detection.md)
- How similarity between two faces is computed and how a person's profile is built — see
  [Face recognition](02-face-recognition.md)
- Tagging a single face while looking at a photo — see
  [Face tagging & suggestions](06-face-tagging-and-suggestions.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Creating and managing people | [Person directory](04-person-directory.md) |
| Progress card and cancellation UI | [Background Processing](../09-background-processing/README.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-04-03.1 | Find groups | Untagged faces collected into draft groups, largest first | shipped |
| F-04-03.2 | Automatic first grouping | Small libraries are grouped without the user asking | shipped |
| F-04-03.3 | Suggested person per group | A proposed name and score for a group, when the app can guess one | shipped |
| F-04-03.4 | Group expansion and paging | The faces inside a group, 25 at a time | shipped |
| F-04-03.5 | Row-wise accept | Five faces tagged per click to the group's target person | shipped |
| F-04-03.6 | Similarity band filters | Members filtered into matching, borderline and unlikely relative to the chosen person | shipped |
| F-04-03.7 | Create a person from a group | Name a new person straight from the group header | shipped |

## 5. User journeys

### J-04-03-1 — Name a group of unknown faces

**Trigger:** the user opens **People → Untagged faces** and presses **Find groups**.
**Preconditions:** face detection has run and the faces are ready for recognition.

1. The progress dock shows **Grouping untagged faces** moving through loading, comparing face pairs,
   saving the groups and refreshing people suggestions.
2. The list fills with groups, largest first, ten per page. Each row shows a representative face, a
   face count, and a **Suggested match** with a percentage when the app recognises a known person.
3. The user picks the person from the group's dropdown — or types a name and presses
   **Create & assign** to create a new person and make them the target.
4. The user expands the group and sees its faces, 25 to a page, sorted with the closest match to the
   chosen person first.
5. For each row of five faces the user presses the accept control. Those faces are tagged to the
   target person and leave the group.
6. Faces the user does not want are hidden from the row rather than tagged.

**Outcome:** a large batch of faces has been attributed to a person in a few clicks, which
immediately improves that person's proposals elsewhere.

**Alternate paths**

- A group's suggested person is right → the dropdown is already usable and the user goes straight to
  accepting rows.
- The group mixes two people → the user accepts only the rows belonging to the target person, then
  changes the target and continues, or leaves the rest for the next grouping run.
- The user re-runs **Find groups** → all groups that have not been fully assigned are discarded and
  rebuilt.

**Failure paths**

- No groups appear → "No face clusters found. Run face detection with embeddings first, then click
  'Find groups'." The likely causes are that detection has not run, that too few faces are ready, or
  that no set of faces reached the minimum group size of 4.
- The user cancels mid-run → grouping stops and the list keeps whatever was already saved.
- The user presses accept without choosing a person → "Select or create a person tag before
  accepting faces." and the group's dropdown is outlined to draw attention.

### J-04-03-2 — Open the tab on a small library and find it already grouped

**Trigger:** the user opens **People → Untagged faces** for the first time.

1. The app checks how many untagged faces are ready and how many are not yet in a group.
2. If there are no groups yet, at least one face is ready, at most 300 faces are ready, and at least
   one of them is ungrouped, grouping starts on its own.
3. The progress card appears and the list fills without the user pressing anything.

**Outcome:** small libraries land on a useful screen instead of an empty one.

**Alternate paths**

- More than 300 ready faces → nothing starts automatically; the user decides when to spend the time.
- Groups already exist → nothing starts automatically, even after new faces are detected.

### J-04-03-3 — Separate the confident members of a group from the doubtful ones

**Trigger:** the user has chosen a target person for an expanded group.

1. A **Show:** row offers **All**, **Matching ≥ 38%**, **28%–38%** and **Below 28%**, where the
   boundaries follow the recognition threshold (default 0.38) and that threshold minus 0.1.
2. Choosing a band reduces the group to the members in it, with the count updated accordingly.
3. The user accepts the matching band, then inspects the borderline band by eye.

**Outcome:** bulk tagging without accepting faces the app itself is unsure about.

**Alternate paths**

- No members fall in the chosen band → "No faces match this filter for the selected person. Try
  'All' or pick another person."

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| **Untagged faces** tab | Sidebar People → Untagged faces | **Find groups** button, refresh, help, group list with pagination | `apps/desktop-media/src/renderer/components/DesktopFaceClusterGrid.tsx` |
| Group row (collapsed) | The list | Representative face, "N faces", suggested match with percentage, person dropdown, **Name this person** | same |
| Group row (expanded) | Click a group | Member grid five across, per-row accept and hide, **Show:** bands, member pagination | same |
| Face hover preview | Hover a face | The whole photo the face came from | `packages/media-viewer/` face preview layer |
| **Grouping untagged faces** card | Progress dock while grouping | Phase text, face-pair count, cancel | `apps/desktop-media/src/renderer/components/progress-dock/` |
| Settings → **Face recognition** | Settings, advanced shown | Group similarity threshold and minimum group size | `apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx` |

**States**

| State | What the user sees |
|---|---|
| Never grouped | The empty-state message pointing at face detection and **Find groups** |
| Grouping | "Grouping..." on the button, phase text in the dock |
| Grouped | Groups listed largest first, ten per page |
| Group without a target person | The dropdown outlined in amber once the group is expanded |
| Filter with no members | The filter-empty message with a suggestion to switch back to **All** |

**UX notes**

- The screen states plainly in its own description that assigning a person to a group does not tag
  every face in it — accepting rows is an explicit act.
- Clicking a face opens the photo it came from in the viewer, so an ambiguous face can be judged in
  context.
- Similarity is shown as a percentage on the face and in the band labels; the underlying threshold
  is never exposed as a raw number in this screen.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Only untagged faces that are ready for recognition take part in grouping. | A face with no visual signature cannot be compared. | `apps/desktop-media/electron/face-clustering.ts` |
| BR-2 | Two faces join the same group when their similarity is at least **How similar two faces must look to join the same group** (default 0.55), applied by progressively merging the closest faces. | One dial controls whether groups are broad or tight. | `apps/desktop-media/electron/face-clustering.ts` |
| BR-3 | A draft group is discarded when it has fewer than **Minimum faces in a suggested group** members (default 4). | One-off detections would otherwise flood the list. | `apps/desktop-media/electron/face-clustering.ts` |
| BR-4 | Groups are listed by member count, largest first. | The biggest win per click comes first. | `apps/desktop-media/electron/face-clustering.ts` |
| BR-5 | Running **Find groups** again clears every group that has not been assigned to a person and rebuilds from the current untagged faces. | Groups are drafts, not durable objects. | `apps/desktop-media/electron/face-clustering.ts` |
| BR-6 | Grouping starts automatically only when there are no groups at all, between 1 and 300 untagged faces are ready, and at least one of them is not yet in a group. | Automatic work is acceptable when it is quick; on a large library it must be the user's choice. | `apps/desktop-media/src/renderer/lib/face-clustering-auto.ts` |
| BR-7 | A group's suggested person is the best-scoring known person for the group's average face, above the recognition threshold. | Turns anonymous groups into one-click confirmations once some people are known. | `apps/desktop-media/electron/face-clustering.ts` |
| BR-8 | Accepting a row tags exactly the faces in that row to the group's target person; the faces then leave the group. | Bulk tagging stays reviewable in units the user can see at once. | `apps/desktop-media/src/renderer/components/DesktopFaceClusterGrid.tsx` |
| BR-9 | Members of an expanded group are ordered by their similarity to the chosen target person, highest first. | The faces most likely to be right are reviewed first. | `apps/desktop-media/src/renderer/components/DesktopFaceClusterGrid.tsx` |
| BR-10 | The similarity bands are derived from the recognition threshold: at or above it, within 0.1 below it, and everything lower. | The bands move with the user's precision setting instead of being hardcoded. | `apps/desktop-media/src/renderer/components/DesktopFaceClusterGrid.tsx` |
| BR-11 | **Create & assign** creates the person and makes them the group's target, but does not tag any faces until rows are accepted. | Creating a person is cheap; tagging dozens of faces on a typo is not. | `apps/desktop-media/src/renderer/components/DesktopFaceClusterGrid.tsx` |
| BR-12 | Tagging faces out of a group triggers the same profile and suggestion refresh as tagging in the viewer. | Group work and single-face work improve recognition equally. | `apps/desktop-media/electron/ipc/face-tags-handlers.ts` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| How similar two faces must look to join the same group | 0.55 | Lower makes fewer, broader groups; higher makes more, tighter groups (BR-2) | Yes |
| Minimum faces in a suggested group | 4 | Draft groups smaller than this are dropped (BR-3) | Yes |
| Similarity threshold for suggesting a person | 0.38 | Sets the suggested person per group and the boundaries of the **Show:** bands | Yes |

Defined in `apps/desktop-media/src/shared/ipc.ts` (`DEFAULT_FACE_DETECTION_SETTINGS`) and surfaced
in Settings → **Face recognition**. The Untagged faces screen reads the current values each time
**Find groups** runs, so a changed setting takes effect on the next run without a restart.

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| One row per draft group, with its member count and average face | `face_clusters` | The group list; discarded and rebuilt by the next **Find groups** |
| Which group a face currently belongs to | `media_face_instances` | Whether a face appears in the Untagged faces screen |
| The person a group was ultimately used for | `face_clusters` | Keeps a fully used group from reappearing as a draft |

Groups are working state, not user content. Losing them costs a **Find groups** run, nothing more.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| [Face detection](01-face-detection.md) | Faces to group | The empty state, pointing at face detection |
| [Face recognition](02-face-recognition.md) | Comparable faces, suggested people, similarity bands | Grouping cannot run; suggested match is absent |
| At least one named person | Suggested people and the bands | Groups are anonymous and must be named by hand |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `media:run-face-clustering` | `similarityThreshold`, `minClusterSize` | Rebuild the draft groups |
| `media:cancel-face-clustering` | `jobId` | Cancel a grouping run |
| `media:face-clustering-progress` | push event | Phase, face pairs compared, group count |
| `media:get-face-clusters` | paging options | The group list for the screen |
| `media:get-face-clustering-stats` | — | Ready untagged faces and how many are ungrouped, used by the automatic run |
| `media:list-cluster-face-ids` | `clusterId`, `offset`, `limit` | One page of a group's members |
| `media:suggest-person-tag-for-cluster` / `media:suggest-person-tags-for-clusters` | `clusterId` / `clusterIds` | Suggested people for one group or many |
| `media:get-cluster-person-match-stats-batch` | `clusterIds`, `tagId` | How many members of each group fall in each similarity band |
| `media:get-cluster-member-face-ids-for-person-similarity-filter` | `clusterId`, `tagId`, band | The members of one band |
| `media:assign-person-tags-to-faces` | `faceInstanceIds`, `tagId` | What accepting a row calls |
| `media:assign-cluster-to-person` | `clusterId`, `tagId` | Tag an entire group in one call (available but not wired to the UI) |

Grouping progress and status live in the shared store slice
`packages/media-store/src/slices/face-clustering.ts`, which is what both the screen and the progress
dock read.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| Unit | `apps/desktop-media/src/renderer/lib/face-clustering-auto.test.ts` | Exactly when grouping starts on its own (BR-6) |
| Unit | `apps/desktop-media/src/renderer/lib/face-clustering-progress-stats.test.ts` | The progress figures shown while grouping |
| Unit | `apps/desktop-media/electron/db/get-cluster-person-match-stats-batch.test.ts` | Band counts per group for a chosen person |
| Unit | `apps/desktop-media/electron/db/face-tags-assign-batch.test.ts` | Batch tagging of the faces behind a row accept |
| Unit | `apps/desktop-media/src/renderer/components/people-pagination-bar.test.ts` | The paging control used for groups and members |

**Coverage gaps:** there is no automated coverage of the grouping algorithm's output, of the group
list screen, or of the accept/hide interactions. The E2E suite reaches the tab
(`apps/desktop-media/tests/e2e/people-module.spec.ts` navigates the People tabs) but does not
exercise grouping.

## 13. Known limitations & open questions

- **Limitation:** groups are rebuilt from scratch, so any manual judgement about a group is lost at
  the next **Find groups**.
- **Limitation:** there is no way to split a group that mixes two people, or to merge two groups of
  the same person; the only remedy is to accept selectively and re-run.
- **Limitation:** an "assign the whole group" action exists in the backend but no button calls it,
  so bulk assignment is always row by row, five faces at a time.
- **Limitation:** hiding a face in a group is only a visual dismissal for the session; it is not
  remembered and the face returns after a refresh.
- **Limitation:** automatic grouping happens at most once per visit and never again once any group
  exists, so a library that has grown since the first run needs a manual **Find groups**.
- **Open question:** whether the 300-face ceiling for automatic grouping should scale with machine
  speed rather than being fixed.

## 14. References

- Module: [People & Faces](README.md)
- [Face recognition](02-face-recognition.md) — the similarity the grouping is built on
- [Face tagging & suggestions](06-face-tagging-and-suggestions.md) — the per-face alternative
- [Person directory](04-person-directory.md) — the people a group can be assigned to
- Recommended setup order: [`../JOURNEYS.md`](../JOURNEYS.md) J-X1, step 4
- Implementation history: `docs/IMPLEMENTATION-LOG/features/2026-03_people_untagged_performance_*.plan.md`
