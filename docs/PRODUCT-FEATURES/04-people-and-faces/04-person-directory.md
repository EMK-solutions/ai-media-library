---
id: F-04-04
module: 04-people-and-faces
title: Person directory
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/DesktopPeopleTagsListTab.tsx
  - apps/desktop-media/src/renderer/hooks/use-desktop-people-tags-list.ts
  - apps/desktop-media/src/renderer/actions/people-actions.ts
  - apps/desktop-media/electron/db/face-tags.ts
related:
  - F-04-02
  - F-04-05
  - F-04-06
---

# Person directory

> The list of everyone the app knows about, with how much is tagged for them and how much is still
> waiting.

## 1. Summary

**People → People** is the register of the people in the library. Each row is one person: their
name, an optional birth date, how many faces are tagged for them, how many similar faces are still
waiting to be confirmed, and which people groups they belong to. Everything a user does to manage
people happens here — adding someone by name, correcting a spelling, recording a birth date,
pinning the people they tag most often to the top of every picker, and deleting someone who should
never have existed.

The directory is intentionally the first tab and the first thing the recommended setup path asks the
user to touch after detection: adding people by name costs seconds and is what makes the tagging and
confirmation steps possible. It is also the screen that tells the user where the remaining work is,
because the two count columns make it obvious which person has the most unconfirmed candidates.

## 2. User stories

- **As a new user** I want to add the people who matter by name before I start tagging, **so that**
  I can pick them from a list instead of typing a name per face.
- **As a frequent tagger** I want the handful of people I tag constantly to be at the top of every
  picker, **so that** tagging does not become a search task.
- **As someone with a long people list** I want to filter it by name and page through it, **so that**
  a hundred people stay manageable.
- **As a parent** I want to record a birth date against a person, **so that** the app holds the
  information needed to reason about their age in a photo.
- **As someone who made a mistake** I want to delete a person and know exactly what that will
  affect, **so that** I do not silently destroy tagging work.

## 3. Scope

**In scope**

- Adding a person, with an optional birth date
- Renaming a person and editing their birth date
- Pinning and unpinning a person
- Filtering the list by name and paging through it
- Hiding birth dates in the table
- Per-person counts of tagged faces and waiting similar faces
- Deleting a person, including the warning about what will be lost
- Assigning a person to people groups from their row

**Out of scope**

- Attaching faces to a person — see [Face tagging & suggestions](06-face-tagging-and-suggestions.md)
- Managing the groups themselves — see [People groups](05-people-groups.md)
- How the similar-faces number is computed — see [Face recognition](02-face-recognition.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Group creation, renaming, deletion | [People groups](05-people-groups.md) |
| The live recount behind the Similar faces column | [Face recognition](02-face-recognition.md) |
| Person filters in search and albums | [M-05](../05-search-and-discovery/README.md), [M-06](../06-albums/README.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-04-04.1 | Add a person | An inline row with a name field and an optional birth date | shipped |
| F-04-04.2 | Rename a person | Inline editing of the name, with duplicate protection | shipped |
| F-04-04.3 | Birth date | An optional `YYYY-MM-DD` value per person, hideable in the table | shipped |
| F-04-04.4 | Pin a person | Pinned people sort first here and in the tagging pickers | shipped |
| F-04-04.5 | Counts per person | Tagged faces and waiting similar faces, side by side | shipped |
| F-04-04.6 | Name filter and paging | Substring filter on the name, ten people per page | shipped |
| F-04-04.7 | Delete a person | A confirmation that states how many face tags and photos are affected | shipped |
| F-04-04.8 | Group membership | Add or remove the person's groups, or create a group, from the row | shipped |

## 5. User journeys

### J-04-04-1 — Add the people who matter

**Trigger:** the user opens **People → People** after a face detection run.
**Preconditions:** none; people can be added before any face exists.

1. The user presses the add control, and an inline row appears at the top of the table with a name
   field and a birth-date field.
2. The user types a name, optionally a birth date as `YYYY-MM-DD`, and saves.
3. The person appears in the list, sorted alphabetically among the unpinned people.
4. The list refreshes and the waiting-faces counts for the visible page are recomputed.

**Outcome:** the person can now be chosen anywhere a face is tagged.

**Alternate paths**

- The name already exists, in any capitalisation → the existing person is returned instead of a
  duplicate being created.
- The birth date is left empty → the person is created without one.

**Failure paths**

- The name is empty → the save is rejected.
- The birth date is not a real calendar day → "Enter a valid birth date (YYYY-MM-DD), or leave
  empty." and nothing is saved.

### J-04-04-2 — Keep the list workable as it grows

**Trigger:** the people list has grown past a screenful.

1. The user types part of a name into the filter in the **Name** column header; the table narrows as
   they type.
2. The pagination bar at the foot moves through the filtered list ten people at a time.
3. The user pins the people they tag most often; pinned people sort to the top of this list and are
   always visible in the tagging pickers.
4. The user hides the birth-date column with the eye control when working with someone watching.

**Outcome:** a long list stays usable, and the common people stay one click away.

**Alternate paths**

- The filter matches nothing → "No people match the filter value" while the table frame stays.

### J-04-04-3 — Delete a person

**Trigger:** the user presses the delete control on a row.

1. The app looks up how many face tags and how many photos that person is attached to.
2. If the person is attached to nothing, they are deleted immediately.
3. Otherwise a confirmation appears — "Delete <name> ?" — stating that this removes the person and
   all linked face and media tags, that it cannot be undone, and showing the two counts.
4. On confirmation the person is removed: their faces become untagged again, their pending
   suggestions and profile are discarded, and they are removed from every group and from any album
   that referenced them.

**Outcome:** the person is gone, but no photo and no face record is deleted — only the attribution.

**Failure paths**

- Deletion fails → "Failed to delete person." is shown above the table and the list is unchanged.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| **People** tab | Sidebar People, first tab | Header with add, refresh and help; description; table; pagination | `apps/desktop-media/src/renderer/components/DesktopPeopleTagsListTab.tsx` |
| Table columns | The tab | **Name** (with inline filter), **BIRTH DATE** (hint `YYYY-MM-DD`, eye toggle), **Tagged faces**, **Similar faces**, **Groups** | same |
| Person row | The table | Pin/unpin, edit name, delete, inline birth-date field, group chips | `apps/desktop-media/src/renderer/components/people-directory-row.tsx` |
| Add row | The add control | Name and birth-date fields with save and cancel | `apps/desktop-media/src/renderer/components/PeopleTagsListAddRow.tsx` |
| Delete confirmation | The delete control on a row with usage | Title, warning, "Face tags: N" and "Media items: N" | `apps/desktop-media/src/renderer/components/PeopleDeleteConfirmDialog.tsx` |
| Group cell | The Groups column | Assigned groups as removable chips, plus adding or creating a group | `apps/desktop-media/src/renderer/components/people-directory-group-cell.tsx` |

**States**

| State | What the user sees |
|---|---|
| No people yet | "No person tags yet. Add people here or in Untagged faces. You can also tag a face in the photo viewer info panel." |
| Filter matches nothing | "No people match the filter value" |
| Similar faces recomputing | A spinner in the column header; each cell keeps its previous number |
| Similar faces recount failed | The cached number, with a "Cached (refresh failed)" tooltip |
| No birth date | An em dash, with "No birth date set" for assistive technology |
| Birth dates hidden | A hidden marker instead of the value; the eye control switches back |

**UX notes**

- Row controls (pin, edit, delete) are revealed on hover or keyboard focus, so a long list is not a
  wall of buttons.
- The birth-date field enforces its shape as the user types, inserting the hyphens for them.
- Hiding birth dates is a view preference: it changes what is on screen, never what is stored.
- The description under the title explains why tagging people is worth the effort — grouping photos
  in albums and narrowing search results.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | A person's name is required and is trimmed before saving. | An unnamed person is unusable in every picker. | `apps/desktop-media/electron/db/face-tags.ts` |
| BR-2 | Names are unique within the library, case-insensitively. Adding an existing name returns the existing person rather than creating a second one. | Prevents two "Anna" entries competing for the same faces. | `apps/desktop-media/electron/db/face-tags.ts` |
| BR-3 | Renaming to a name already used by someone else is rejected with "A person tag with this name already exists." | Same reason, applied to edits. | `apps/desktop-media/electron/db/face-tags.ts` |
| BR-4 | A birth date is optional and must be a real calendar day in `YYYY-MM-DD` form; anything else is refused. | A half-typed date would be worse than none. | `apps/desktop-media/src/renderer/lib/birth-date-input.ts` |
| BR-5 | The list sorts pinned people first, then by name case-insensitively. | The people the user tags most often stay reachable. | `apps/desktop-media/electron/db/face-tags.ts`, `src/renderer/lib/compare-person-tag-rows.ts` |
| BR-6 | The list shows ten people per page, and the name filter applies before paging. | Keeps the per-page live recount of waiting faces affordable. | `apps/desktop-media/src/renderer/hooks/use-desktop-people-tags-list.ts` |
| BR-7 | Tagged-face counts exclude faces belonging to photos that have been removed from the catalog. | A count must match what the user can actually open. | `apps/desktop-media/electron/db/face-tags.ts` |
| BR-8 | Deleting a person is only confirmed when they are attached to at least one face or photo; otherwise it happens immediately. | No confirmation dialog for a harmless action. | `apps/desktop-media/src/renderer/hooks/use-desktop-people-tags-list-actions.ts` |
| BR-9 | Deleting a person untags their faces rather than deleting them, and removes their profile, pending suggestions, group memberships and album references. | The detection work survives; only the attribution goes. | `apps/desktop-media/electron/db/face-tags.ts` |
| BR-10 | Adding or deleting a person refreshes the list and recomputes the waiting-face counts for the current page. | The numbers the user just changed are the ones they are looking at. | `apps/desktop-media/src/renderer/hooks/use-desktop-people-tags-list-actions.ts` |

## 8. Settings & defaults

None — this feature exposes no user settings. The **Similar faces** column reflects the recognition
threshold owned by [Face recognition](02-face-recognition.md) (default 0.38). Hiding birth dates and
the current page are session state, not persisted settings.

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Person name, pinned flag, birth date | `media_tags` rows of type `person` | The directory itself; survives restart |
| Which faces belong to the person | `media_face_instances` | The **Tagged faces** count and everything downstream |
| Cached count of waiting similar faces | `person_centroids` | The **Similar faces** column before a live recount |
| Group membership | `person_tag_groups` | The **Groups** column |

People are library data. They are not written into the photos' embedded metadata, and removing a
library root discards them without touching any file.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| [Face recognition](02-face-recognition.md) | The **Similar faces** column | Zeros in that column; the rest of the screen works |
| [People groups](05-people-groups.md) | The **Groups** column | An empty cell with the option to create a group |
| The desktop bridge exposing delete support | Deleting a person | "Delete support is loading. Please restart the desktop app and try again." |

## 11. Automatable actions & API surface

Action registry: `apps/desktop-media/src/renderer/actions/people-actions.ts`
(`createDesktopPeopleActions`), which both the UI and automation call.

| Action / channel | Parameters | Intent |
|---|---|---|
| `createPersonTag` / `media:create-person-tag` | `label`, `birthDate` | Add a person, or return the existing one with that name |
| `updatePersonTagLabel` / `media:update-person-tag-label` | `tagId`, `label` | Rename a person |
| `updatePersonTagBirthDate` / `media:update-person-tag-birth-date` | `tagId`, `birthDate` \| `null` | Set or clear a birth date |
| `setPersonTagPinned` / `media:set-person-tag-pinned` | `tagId`, `pinned` | Pin or unpin |
| `getPersonTagDeleteUsage` / `media:get-person-tag-delete-usage` | `tagId` | How many faces and photos a delete would affect |
| `deletePersonTag` / `media:delete-person-tag` | `tagId` | Delete the person |
| `media:list-person-tags` / `media:list-person-tags-with-face-counts` | — | The directory, with or without counts |
| `media:list-faces-for-person` | `tagId` | The faces tagged for one person |
| `media:set-person-tag-groups` / `media:get-person-tag-groups-for-tag-ids` | `tagId`, `groupIds` / `tagIds` | Group membership from the row |

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/people-module.spec.ts` | The People list opens from the sidebar, the add row exposes a name field, and the birth-date column is present |
| Unit | `apps/desktop-media/src/renderer/actions/people-actions.test.ts` | The action registry: create, rename, birth date, pin, delete-usage fallback, delete guard |
| Unit | `apps/desktop-media/electron/db/face-tags.test.ts` | Name uniqueness, birth-date normalisation, pinning, delete cascade, count queries |
| Unit | `apps/desktop-media/src/renderer/lib/compare-person-tag-rows.test.ts` | Pinned-first, then case-insensitive name ordering |
| Unit | `apps/desktop-media/src/renderer/lib/birth-date-input.test.ts` | Input shaping and calendar validity |
| Unit | `apps/desktop-media/src/renderer/lib/person-similar-untagged-display.test.ts` | Live, cached and loading states of the Similar faces column |
| Unit | `apps/desktop-media/src/renderer/components/people-pagination-bar.test.ts` | Page maths and bounds of the pagination bar |

**Coverage gaps:** the delete confirmation dialog, the birth-date visibility toggle and the group
cell have no dedicated automated coverage.

## 13. Known limitations & open questions

- **Limitation:** a birth date can be recorded but the app does not display a person's age at the
  time a photo was taken anywhere in the People screens, even though the calculation exists in
  `packages/media-metadata-core/src/person-age.ts`.
- **Limitation:** there is no way to merge two people, so a duplicate created under a different
  spelling has to be emptied by hand before it can be deleted.
- **Limitation:** the directory carries no photo per person — rows are text and counts only, so the
  user identifies people by name rather than by face.
- **Limitation:** deleting a person cannot be undone and does not offer a way to reassign their
  faces to someone else in the same action.
- **Open question:** whether pinning should be capped. Pinning every person makes the "pinned first"
  ordering in the tagging pickers meaningless.

## 14. References

- Module: [People & Faces](README.md)
- [Face tagging & suggestions](06-face-tagging-and-suggestions.md) — where people get attached to faces
- [People groups](05-people-groups.md) — the groups shown in the last column
- [Face recognition](02-face-recognition.md) — where the Similar faces number comes from
- Recommended setup order: [`../JOURNEYS.md`](../JOURNEYS.md) J-X1, step 4
- Implementation history: `docs/IMPLEMENTATION-LOG/features/2026-03_desktop_people_ux_*.plan.md`
