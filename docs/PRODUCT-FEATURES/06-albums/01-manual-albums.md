---
id: F-06-01
module: 06-albums
title: Manual albums
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/DesktopAlbumsWorkspace.tsx
  - apps/desktop-media/src/renderer/components/DesktopSidebarAlbumsSection.tsx
  - apps/desktop-media/electron/db/media-albums.ts
  - packages/media-store/src/slices/albums.ts
related:
  - F-06-02
  - F-06-03
  - F-01-07
  - F-01-03
---

# Manual albums

> Name a collection, drop photos into it from anywhere in the library, and keep them in the order
> you want — without moving a file.

## 1. Summary

A manual album is a titled, ordered set of catalog items. Adding a photo does not copy or move it;
the same photo can sit in several albums. The user creates the album from the Albums sidebar or the
workspace header, then adds members from the per-item **Albums** menu wherever that photo already
is. The album card shows a cover, a count, a place hint and up to three people. Opening the album
uses the same grid, list and viewer as a folder. In grid view, with no extra filters on, thumbnails
can be dragged to change the stored order.

## 2. User stories

- **As a curator** I want a named album I fill myself, **so that** a trip or a person has a gallery
  I chose.
- **As someone who jumps between albums** I want recently used ones in the sidebar, **so that** I
  can reopen them without searching.
- **As someone preparing a slideshow** I want to drag thumbnails into a sequence, **so that** the
  order matches the story I want to tell.

This is not for automatically derived collections — those are [Smart albums](02-smart-albums.md).

## 3. Scope

**In scope**

- Creating an album, listing albums, opening detail, paging the list (24 per page)
- Recent albums (max 10), sidebar title search, empty and filtered-empty states
- Cover display (chosen or automatic fallback)
- Persisted member order and drag-reorder in the unfiltered grid
- Opening members in the viewer; grid and list view on the album

**Out of scope**

- Adding or removing members, setting the cover, and album-only item actions — see
  [Media item actions](../01-library-browsing-and-media-viewer/07-media-item-actions.md)
- Album list search (title, location, dates, people) — see
  [Album filters & defaults](03-album-filters-and-defaults.md)
- Smart albums — see [Smart albums](02-smart-albums.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Item ⋮ → Albums, Set as cover, Remove from album | [Media item actions](../01-library-browsing-and-media-viewer/07-media-item-actions.md) |
| Viewer slideshow | [Media viewer & slideshow](../01-library-browsing-and-media-viewer/03-media-viewer-and-slideshow.md) |
| Thumbnail quick filters on album contents | [Quick filters](../01-library-browsing-and-media-viewer/06-quick-filters.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-06-01.1 | Create & list | Named albums as cards; empty library shows create in the header | shipped |
| F-06-01.2 | Album detail | Title, grid/list of members, paging (48 per page), empty hint | shipped |
| F-06-01.3 | Recent | Up to 10 recently used albums in the sidebar | shipped |
| F-06-01.4 | Cover | Chosen cover, or the highest-rated member when none is set | shipped |
| F-06-01.5 | Reorder | Drag thumbnails in the unfiltered grid; order is saved | shipped |

## 5. User journeys

### J-06-01-1 — Create the first album and add photos

**Trigger:** the user opens **Albums** with no albums yet.
**Preconditions:** at least some photos are in the catalog (needed later to add members).

1. The list shows “You have no albums yet…” and a **New album title** field in the header.
2. The user types a title and chooses **Create** (or presses Enter).
3. Detail opens on the empty album, with a hint to add items from a folder via the thumbnail ⋮
   **Albums** action.
4. The user switches to **Folders**, opens a photo’s ⋮ menu, and ticks this album.

**Outcome:** the album exists, appears in **RECENT**, and contains the chosen photos.

**Failure paths**

- Empty or whitespace-only title → Create does nothing; the catalog also rejects an empty title
  with “Album title is required.”

### J-06-01-2 — Reopen from Recent and reorder

**Trigger:** the user expands sidebar **RECENT** and clicks an album.
**Preconditions:** the album has at least two members; view mode is grid; no quick filters are on.

1. Detail opens at the stored order (position, then date added).
2. The user drags a thumbnail so it sits before another.
3. The new order is saved and the album is marked recent again.

**Outcome:** the sequence is the one the user arranged.

**Alternate paths**

- Quick filters are active, or the view is list → drag-reorder is not offered.
- **ALL ALBUMS** → the full card list opens with search filters shown.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Albums list | Sidebar **Albums** / **ALL ALBUMS** | Heading **Albums**, search and create, cards (cover, title, count, place, people) | `apps/desktop-media/src/renderer/components/DesktopAlbumsWorkspace.tsx`, `DesktopAlbumCard.tsx` |
| Create | Header **Create album**, sidebar **+**, or empty-library header field | Placeholder **New album title**, **Create** | `DesktopAlbumsWorkspaceHeader.tsx` |
| Album detail | Card, Recent, or sidebar search hit | Back, title, quick filters, grid/list, member grid | `DesktopAlbumContentGrid.tsx` |
| Sidebar Albums | **Albums** section expanded | **Search albums**, **RECENT**, **ALL ALBUMS**, **SMART ALBUMS** | `DesktopSidebarAlbumsSection.tsx` |

**States**

| State | What the user sees |
|---|---|
| No albums in the library | Dashed empty panel; create field in the header; album search hidden |
| Filters match nothing | “No albums match the current filters.” |
| Album has no items | “This album is empty.” plus the ⋮ **Albums** hint |
| Quick filters hide every member | “No album items match the current filters.” |
| Loading | “Loading...” |

**UX notes**

- Cards use a 4:3 cover; videos play muted on the card. With no cover file, a placeholder icon
  is shown.
- Person labels on the card are the first three people linked to the album.
- Sidebar title search is case-insensitive and lists matches above the sections. The sidebar loads
  up to 200 albums for that search.
- **RECENT** starts collapsed. An empty recent list collapses the section.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | A new album needs a non-empty trimmed title. | Prevents unnamed rows. | `apps/desktop-media/electron/db/media-albums.ts` |
| BR-2 | Adding a member that is already in the album is ignored. Unknown ids are skipped. New members append at the end. | Membership is a set with a display order. | `media-albums.ts` |
| BR-3 | Items list in stored position, then the time they were added. Deleted catalog rows are omitted. | The user’s sequence survives restart. | `media-albums.ts` |
| BR-4 | Reorder moves an item to sit before a global index (0 = first; album length = after last). | Drag in a paged grid still updates the whole album. | `media-albums.ts`, `DesktopAlbumContentGrid.tsx` |
| BR-5 | Drag-reorder is offered only in grid view, with a manual album id, and with no active quick filters. | Filtered or list indices would not match stored positions. | `DesktopAlbumContentGrid.tsx` |
| BR-6 | If the user has not chosen a cover, the card uses the member with the highest star rating, then AI quality, then position. | Every non-empty album can show a picture. | `media-albums.ts` |
| BR-7 | Selecting, creating, adding to, or reordering an album puts it first in Recent, capped at 10. Deleting it (via API) drops it from Recent. | Recent is a short working set. | `packages/media-store/src/slices/albums.ts` |
| BR-8 | Album list cards are ordered by last update, then title. Page size 24 (max 200). | Newest work stays at the top. | `media-albums.ts` |
| BR-9 | Deleting an album removes its membership, person-tag and category rows. Files on disk are not touched. | The album is a catalog construct. | `media-albums.ts` |

## 8. Settings & defaults

None — this feature exposes no user settings. Recent expansion in the sidebar defaults to collapsed
(`DEFAULT_SIDEBAR_ALBUMS_EXPAND_RECENT` = false). List and smart-album *filters* are
[F-06-03](03-album-filters-and-defaults.md).

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Album title, optional description, optional cover id | `media_albums` | Survives restart. Description is stored but not edited in the current workspace. |
| Membership and position | `media_album_items` | Order and contents of the album |
| Recent album ids | `localStorage` key `desktop-media.recentAlbumIds.v1` | Sidebar **RECENT**; not the catalog |

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Catalog rows for member files | Thumbnails and viewer | Empty album, or members missing after a scan removes them |
| [F-01-07](../01-library-browsing-and-media-viewer/07-media-item-actions.md) | Adding photos | Empty-state hint points at the ⋮ menu |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `createAlbum` | `title` | Create, select, and mark recent |
| `loadAlbums` | list filters, `offset`, `limit` | Refresh the card list |
| `loadAlbumItems` | `albumId`, paging | Load members |
| `renameAlbum` / `deleteAlbum` | `albumId`, title | Rename or delete (no albums-workspace UI today) |
| `addMediaItemsToAlbum` / `removeMediaItemFromAlbum` | album and item ids | Membership |
| `reorderAlbumMediaItem` | `albumId`, `mediaItemId`, `insertBeforeIndex` | Change order |
| `setAlbumCover` | `albumId`, item id or null | Cover |
| `listAlbumsForMediaItem` | item id or path | Memberships for the item menu |

Defined in `apps/desktop-media/src/renderer/actions/album-actions.ts` and
`apps/desktop-media/electron/ipc/album-handlers.ts`.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/albums.spec.ts` | Empty-library create, detail heading, back to list |
| E2E | `apps/desktop-media/tests/e2e/albums-reorder.spec.ts` | Grid drop updates catalog order |
| Integration | `apps/desktop-media/electron/db/media-albums.integration.test.ts` | Cover fallback, reorder, duplicates ignored, delete cascades |
| Unit | `apps/desktop-media/src/renderer/actions/album-actions.test.ts` | Create/select/recent, rename, delete, reorder |
| Unit | `apps/desktop-media/src/renderer/components/DesktopAlbumsWorkspace.test.tsx` | Remove-from-album refreshes the card count |
| Unit | `packages/media-store/src/slices/albums.test.ts` | Recent cap of 10 |

**Coverage gaps:** no UI test that rename/delete are reachable (they are not). Sidebar Recent
persistence across restart is not covered by E2E.

## 13. Known limitations & open questions

- **Limitation:** rename and delete are not on the albums workspace. `DesktopAlbumDetailPanel`
  implements them but is not mounted.
- **Limitation:** album description exists in the catalog and is always null from the current UI.
- **Open question:** whether non-empty albums should ask for confirmation before delete, once a
  delete control exists.

## 14. References

- Module: [Albums](README.md)
- [Smart albums](02-smart-albums.md), [Album filters & defaults](03-album-filters-and-defaults.md)
- [Media item actions](../01-library-browsing-and-media-viewer/07-media-item-actions.md)
