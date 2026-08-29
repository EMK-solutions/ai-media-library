---
id: F-04-05
module: 04-people-and-faces
title: People groups
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/DesktopPeopleGroupsTab.tsx
  - apps/desktop-media/src/renderer/hooks/use-desktop-people-groups-tab.ts
  - apps/desktop-media/src/renderer/hooks/use-person-tag-group-actions.ts
  - apps/desktop-media/electron/ipc/face-tags-handlers.ts
related:
  - F-04-04
  - F-04-06
---

# People groups

> Name a set of people once — family, classmates, a trip — and use that set wherever the product
> filters by person.

## 1. Summary

A people group is a named collection of people, nothing more. It does not tag faces, does not
move files, and deleting it does not delete anyone. Its job is to spare the user from picking the
same five names every time they search, filter a smart album, or look at "best of" a household.

Groups are created and renamed on **People → People groups**. Membership is edited there (remove
someone from a group) and from the People directory (add someone to groups). Empty groups are
allowed, so the user can create the structure first and fill it as they add people.

## 2. User stories

- **As a family organiser** I want a group called "Family" that I can reuse in search and albums,
  **so that** I do not re-select the same people every time.
- **As someone with a long people list** I want to park people in named sets,
  **so that** the directory stays scannable.
- **As someone who made a group by mistake** I want to delete the group without deleting the
  people, **so that** tidying structure is safe.

## 3. Scope

**In scope**

- Creating, renaming and deleting groups
- Adding and removing people from groups
- Showing group membership on the People directory

**Out of scope**

- Using groups as search or smart-album filters — owned by
  [M-05 Search & Discovery](../05-search-and-discovery/README.md) and
  [M-06 Albums](../06-albums/README.md)
- Creating people — owned by [Person directory](04-person-directory.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Adding a person to groups from their directory row | [Person directory](04-person-directory.md) |
| Filtering search or albums by a group | M-05, M-06 |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-04-05.1 | Group CRUD | Create, rename, delete a named group | shipped |
| F-04-05.2 | Membership | Add and remove people; empty groups allowed | shipped |
| F-04-05.3 | Directory chips | Groups shown on each person in the People tab | shipped |

## 5. User journeys

### J-04-05-1 — Create a group and fill it

**Trigger:** the user wants a reusable set of people.
**Preconditions:** at least some people exist in the directory (or the user will add them later).

1. Open **People → People groups**.
2. Type a name and click **Create**. An empty group appears.
3. Switch to **People → People** and add people to the group from a person's groups control —
   or create the group from there in the same flow.
4. Back on **People groups**, each member appears as a chip. Removing a chip removes that person
   from this group only.

**Outcome:** the group can be used as a filter elsewhere in the product.

### J-04-05-2 — Delete a group

**Trigger:** the user no longer needs the grouping.

1. On the group row, choose **Delete group** and confirm.
2. The grouping is removed. Every person in it still exists, with all of their face tags intact.

**Outcome:** structure is gone; tagging work is not.

**Failure paths**

- Load error → an error message is shown; **Refresh** retries.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| People groups tab | Sidebar **People** → **People groups** | Title, help, refresh, create field, group rows with member chips, edit/delete | `apps/desktop-media/src/renderer/components/DesktopPeopleGroupsTab.tsx` |
| People directory Groups column | **People → People** | Membership chips per person; add/remove/create group | `apps/desktop-media/src/renderer/components/DesktopPeopleTagsListTab.tsx` |

**States**

| State | What the user sees |
|---|---|
| Empty | "No groups yet. Create one from the People tab or add a group here." |
| Loading | Spinner on refresh |
| Group with no members | "No people assigned." |
| Delete confirm | Dialog; confirm does not delete people |

**UX notes** — edit and delete on a group row appear on hover (and stay visible on small screens).
Copy on the tab states explicitly that deleting a group does not delete person tags.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | A group is a named set of people. It does not itself tag any face. | Keeps organisation separate from identity. | `apps/desktop-media/src/renderer/components/DesktopPeopleGroupsTab.tsx` |
| BR-2 | Deleting a group removes only the grouping. | Accidental delete must not destroy tagging work. | `apps/desktop-media/src/renderer/hooks/use-desktop-people-groups-tab.ts` |
| BR-3 | Removing a member chip removes that person from this group only. | People can belong to several groups. | `apps/desktop-media/src/renderer/hooks/use-desktop-people-groups-tab.ts` |
| BR-4 | Empty groups are allowed. | Users can sketch structure before they have tagged anyone. | `apps/desktop-media/src/renderer/hooks/use-desktop-people-groups-tab.ts` |

## 8. Settings & defaults

None — this feature exposes no user settings.

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Group name | `person_groups` | Survives restart |
| Membership | `person_tag_groups` | Which people belong to which groups |

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| [Person directory](04-person-directory.md) | People to put in groups | Empty groups can still be created |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `media:list-person-groups` | — | List groups |
| `media:create-person-group` | `name` | Create a group |
| `media:set-person-tag-groups` | `tagId`, `groupIds[]` | Set which groups a person belongs to |
| `media:delete-person-group` | `groupId` | Delete the grouping only |

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/people-module.spec.ts` | Groups tab is reachable |
| Unit | `apps/desktop-media/src/renderer/hooks/use-desktop-people-tags-list-actions.test.tsx` | Related people-directory actions |

**Coverage gaps:** no dedicated E2E for create / rename / delete group or membership chips.

## 13. Known limitations & open questions

- **Limitation:** membership is easier to *add* from the People directory than from the groups
  tab, which mainly removes members.
- **Open question:** whether a group should be creatable with an initial member list in one step
  on the groups tab.

## 14. References

- Module: [People & Faces](README.md)
- [Person directory](04-person-directory.md)
