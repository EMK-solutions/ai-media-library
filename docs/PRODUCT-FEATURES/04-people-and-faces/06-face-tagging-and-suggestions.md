---
id: F-04-06
module: 04-people-and-faces
title: Face tagging & suggestions
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/DesktopFaceTagsTabContent.tsx
  - apps/desktop-media/src/renderer/components/DesktopPeopleWorkspace.tsx
  - packages/media-viewer/src/people-face-workspace.tsx
  - packages/media-viewer/src/face-bounding-box-overlay.tsx
  - apps/desktop-media/electron/ipc/face-tags-handlers.ts
related:
  - F-04-01
  - F-04-02
  - F-04-03
  - F-04-04
---

# Face tagging & suggestions

> Name the faces in a photo, then confirm the matches the app finds for the same person
> across the rest of the library.

## 1. Summary

This is the human loop that makes recognition useful. Detection finds boxes; recognition ranks
lookalikes; tagging is where the user actually says "this is Maria" and "yes, that one too".
There are two places to do it, on purpose:

- **In the viewer**, on the **Face tags** tab, while looking at one photo. This is how the user
  plants the first three to five examples per person — the step the
  [recommended setup path](../JOURNEYS.md) insists on before trusting suggestions.
- **In People → Tagged faces**, looking at one person at a time: the faces already named, plus
  a list of untagged faces the app believes are the same person. Confirm or decline in bulk.

The app never attaches a name on its own. A suggestion is a proposal until the user accepts it.
Each acceptance is folded back into that person's profile, so the next list is better than the
last — which is why working one frequently appearing person to completion beats tagging
randomly across the library.

## 2. User stories

- **As a new user** I want to tag a few clear faces on real photos, **so that** the app has
  examples good enough to propose the rest.
- **As someone reviewing a person** I want a single screen of "already tagged" and "looks like
  them", **so that** I can confirm a dozen matches in a minute.
- **As someone looking at a family photo** I want to name every face on it without leaving the
  viewer, **so that** tagging fits into browsing.
- **As someone who disagrees with a proposal** I want to decline it, **so that** the same wrong
  match is not offered again unchanged.

## 3. Scope

**In scope**

- Assigning, changing and clearing a person on a detected face
- Creating a person inline while tagging
- Confirming and declining suggested matches
- Face boxes overlaid on the photo in the viewer
- Running detection for the current photo only ("Detect faces — local")

**Out of scope**

- How suggestions are scored — see [Face recognition](02-face-recognition.md)
- Grouping unknown faces to name in bulk — see [Untagged face grouping](03-untagged-face-grouping.md)
- Including unconfirmed matches in search — see
  [M-05 Search & Discovery](../05-search-and-discovery/README.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Finding the boxes in the first place | [Face detection](01-face-detection.md) |
| Adding people by name in the directory | [Person directory](04-person-directory.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-04-06.1 | Viewer Face tags tab | Name each face on the current photo; see boxes on the image | shipped |
| F-04-06.2 | Tagged faces workspace | One person, their tagged faces, and suggested matches to confirm or decline | shipped |
| F-04-06.3 | Single-photo detection | Detect faces on this image without running the folder pipeline | shipped |

## 5. User journeys

### J-04-06-1 — Plant the first examples (recommended)

**Trigger:** step 4 of [J-X1](../JOURNEYS.md), after people have been added by name.
**Preconditions:** face detection has run on the folder; the person exists in the directory.

1. Open a photo where the person is clearly visible.
2. Open the **Face tags** tab. Boxes appear on the image; each face has a person picker.
3. Choose the person from the dropdown (pinned people sit at the top). Repeat on two to four
   more photos — **at least three to five clearly visible faces** in total.
4. Each assignment rebuilds that person's profile and refreshes suggestions.

**Outcome:** Tagged faces now has a useful "looks like them" list.

**Alternate paths**

- Person does not exist yet → create them inline from the picker, then assign.
- No boxes on the photo → **Detect faces — local** runs detection for this image only.

### J-04-06-2 — Confirm suggested matches

**Trigger:** the user returns to **People → Tagged faces** after planting examples.

1. Select the person (pinned people are always visible as chips).
2. Review already-tagged faces on one side and suggested matches on the other.
3. Confirm the correct rows; decline the rest.
4. Confirmed faces join the tagged set; the person's profile is rebuilt; the suggestion list
   refreshes.

**Outcome:** more of that person's photos are named, and the next suggestions are sharper.

**Failure paths**

- No suggestions yet → the list is empty until more faces are detected or the threshold in
  Settings is lowered (advanced). The user should tag more examples first, not chase the
  threshold.

### J-04-06-3 — Correct a mistake on one photo

**Trigger:** a face is tagged as the wrong person, or should be untagged.

1. Open the photo → **Face tags**.
2. Change the person on that face, or clear the tag.

**Outcome:** the old person's profile and the new person's profile both refresh.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Viewer Face tags tab | Open a photo → Info panel → **Face tags** | Face list with picker, suggestion row, detect-local, overlay boxes | `apps/desktop-media/src/renderer/components/DesktopFaceTagsTabContent.tsx` |
| Face overlay | Same, while Face tags is open | Boxes on the image, selected face highlighted | `packages/media-viewer/src/face-bounding-box-overlay.tsx` |
| Tagged faces workspace | Sidebar **People** → **Tagged faces** | Person chips, name filter, tagged grid, suggested-match grid, confirm/decline | `apps/desktop-media/src/renderer/components/DesktopPeopleWorkspace.tsx` |

**States**

| State | What the user sees |
|---|---|
| No faces on this photo | Empty tab plus **Detect faces — local** |
| Detection running | Spinner on the local-detect action |
| Person with no suggestions | Tagged faces only; empty suggestions pane |
| AI age/gender | Optional line on a face when the setting **Show AI age/gender in Face tags panel** is on (default off) |

**UX notes** — pinned people stay visible in the Tagged faces chip row even when the list is
collapsed. Opening a face from People can open the viewer on that photo with the Face tags tab
already selected.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | The app never attaches a person to a face without an explicit user action (assign, confirm, or bulk-assign a group). | False automatic names are worse than an untagged face. | `apps/desktop-media/electron/ipc/face-tags-handlers.ts` |
| BR-2 | Assigning or confirming a face refreshes that person's profile and suggestions. | Each confirmation should improve the next list. | `apps/desktop-media/electron/db/person-suggestions.ts` |
| BR-3 | Clearing or changing a tag refreshes the people involved. | Stale suggestions would keep offering the wrong name. | `apps/desktop-media/electron/ipc/face-tags-handlers.ts` |
| BR-4 | Suggested matches are untagged faces above the recognition threshold; they are not tags. | Search can optionally include them; the catalog of "who is in this photo" does not until confirmed. | [Face recognition](02-face-recognition.md) |
| BR-5 | Pinned people are always included in the collapsed Tagged faces chip list. | The people the user tags most must not hide behind "Show all". | `apps/desktop-media/src/renderer/lib/tagged-faces-tab-visible-tags.ts` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| Show AI age/gender in Face tags panel | Off | Shows the detector's age/gender guess next to a face | Yes (Face detection) |
| Similarity threshold for suggesting a person | 0.38 | How similar a face must look to appear as a suggestion | Yes (Face recognition) |

Tagging itself has no dedicated setting. Threshold meaning is documented in
[Face recognition](02-face-recognition.md).

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Face-to-person assignment | `media_face_instances` (person on that face) | Survives restart; this is a confirmed tag |
| Suggested match | `media_item_person_suggestions` | Proposal only; not a tag |

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| [Face detection](01-face-detection.md) | Boxes to tag | Empty Face tags tab; local detect may still run |
| [Face recognition](02-face-recognition.md) | Suggestion lists | Tagging still works; suggestions stay empty |
| [Person directory](04-person-directory.md) | Names to assign | Inline create still works |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `media:assign-person-tag-to-face` | `faceInstanceId`, `tagId` | Tag one face |
| `media:assign-person-tags-to-faces` | face ids + tag | Tag many faces (confirm / bulk) |
| `media:list-face-instances-for-media-item` | media item | Faces on one photo |
| `media:list-faces-for-person` | `tagId` | Tagged faces for Tagged faces tab |
| `media:refresh-person-suggestions-for-tag` | `tagId` | Rebuild proposals for one person |
| `media:detect-faces-for-media-item` | media item | Local detect on the current photo |

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/people-module.spec.ts` | People workspace tabs |
| E2E | `apps/desktop-media/tests/e2e/rotated-face-similarity.spec.ts` | Suggestion visible in Face tags after rotation |
| E2E | `apps/desktop-media/tests/e2e/face-pipeline-person-search.spec.ts` | Tagged person usable downstream |
| E2E | `apps/desktop-media/tests/e2e/viewer-face-tags-overlay-regression.spec.ts` | Overlay clears when the next image has no faces |
| Unit | `apps/desktop-media/electron/db/person-suggestions.test.ts` | Suggestion index |
| Unit | `apps/desktop-media/src/renderer/actions/people-actions.test.ts` | Person CRUD used while tagging |

**Coverage gaps:** no E2E for confirm/decline on the Tagged faces grid, or for inline person
create from the viewer picker.

## 13. Known limitations & open questions

- **Limitation:** declining a suggestion does not permanently ban that face from being proposed
  again if the profile later still scores it above the threshold; the durable fix is to tag it
  as someone else or leave it untagged and raise examples for the intended person.
- **Limitation:** local detect on one photo does not by itself run the rest of the folder.
- **Open question:** whether a "not this person" action should persist as a negative example.

## 14. References

- Module: [People & Faces](README.md)
- [Face recognition](02-face-recognition.md) — how proposals are scored
- [Untagged face grouping](03-untagged-face-grouping.md) — naming unknown groups in bulk
- Cross-module path: [JOURNEYS.md](../JOURNEYS.md) J-X1 step 4
