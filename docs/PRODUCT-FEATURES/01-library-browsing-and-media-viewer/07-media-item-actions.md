---
id: F-01-07
module: 01-library-browsing-and-media-viewer
title: Media item actions
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/DesktopMediaItemActionsMenu.tsx
  - packages/media-viewer/src/grid/media-item-actions-menu.tsx
  - apps/desktop-media/src/renderer/actions/album-actions.ts
  - apps/desktop-media/electron/ipc/fs-handlers.ts
related:
  - F-01-02
  - F-01-05
---

# Media item actions

> A small menu on every thumbnail: put the photo in an album, find pictures that look like it,
> open its folder in the file manager, or copy its path.

## 1. Summary

Every photo and video in the app carries the same per-item menu, opened from a discreet button
that appears on the thumbnail on hover and sits permanently on a list row. The menu is short by
design and holds only actions that make sense for a single item: adding it to or removing it from
albums, finding images that look like it, revealing it in the operating system's file manager, and
copying its full path to the clipboard.

The **Albums** entry opens a small panel inside the menu with a search box and a checkbox per
album. Ticking an album adds the photo, unticking removes it, and the panel stays open so several
albums can be handled in one visit. The albums the photo already belongs to are listed first,
followed by recently used albums, so the common case needs no searching.

When the same menu is opened on an item inside an album, two extra actions appear at the top:
setting that item as the album's cover, and removing it from the album. Those only exist in album
context, so a photo in a folder can never be "removed from an album" by accident.

## 2. User stories

- **As someone organising photos** I want to add a picture to an album from where I see it,
  **so that** curating does not mean navigating elsewhere first.
- **As someone with near-duplicates** I want to find the pictures that look like this one,
  **so that** I can pick the best of a burst.
- **As someone who also uses the file manager** I want to jump straight to the file on disk,
  **so that** I can copy, back up or edit it with other tools.
- **As someone writing something up** I want the full file path on the clipboard, **so that** I
  can paste it into a document or a script.
- **As someone curating an album** I want to choose its cover from the album itself, **so that**
  the album looks right in the list.

## 3. Scope

**In scope**

- The per-item menu, how it opens and closes, and what it contains
- The Albums panel: search, ordering, and membership toggling
- Find similar, Show in File Explorer and Copy file path
- The album-only actions and when they appear
- The notice explaining that AI analysis is unavailable for videos

**Out of scope**

- Rating, which has its own always-visible control — see [Star rating](05-star-rating.md)
- Album creation, ordering and management — owned by [M-06 Albums](../06-albums/README.md)
- The similar-images results screen — owned by
  [M-05 Search & Discovery](../05-search-and-discovery/README.md)
- Folder-level actions such as scanning and running AI, which live on the folder row menu — see
  [Library roots & folder tree](01-library-roots-and-folder-tree.md)
- Deleting files, which happens only through duplicate review in
  [M-08 Insights & Library Health](../08-insights-and-library-health/README.md)

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-01-07.1 | Albums submenu | A searchable list of albums with a checkbox each, showing and changing this item's membership | shipped |
| F-01-07.2 | Find similar | Opens the similar-images view seeded from this image | shipped |
| F-01-07.3 | Show in File Explorer | Opens the containing folder in the operating system's file manager with the file selected | shipped |
| F-01-07.4 | Copy file path | Puts the item's full path on the clipboard | shipped |
| F-01-07.5 | Set as album cover | In album context, makes this item the album's cover image | shipped |
| F-01-07.6 | Remove from album | In album context, takes this item out of the album without touching the file | shipped |
| F-01-07.7 | Video capability notice | A greyed-out line explaining that AI analysis is not available for videos yet | shipped |

## 5. User journeys

### J-01-07-1 — Add a photo to albums while browsing

**Trigger:** the user spots a photo worth collecting.
**Preconditions:** at least one album exists.

1. The user hovers the thumbnail; the actions button appears in its top-right corner.
2. Clicking it opens the menu. The user chooses **Albums**, which replaces the menu's contents
   with a **Find album** box and a list of up to five albums.
3. The albums the photo is already in are listed first with their boxes ticked, followed by
   recently used albums, then the rest.
4. Ticking an album adds the photo; unticking removes it. The panel stays open and the album order
   does not jump around, so several albums can be changed in a row.
5. Typing in the search box narrows the list, still capped at five entries.
6. The user goes back with the chevron beside "Albums", or closes the whole menu with the close
   button, Escape, or a click elsewhere.

**Outcome:** the photo's album membership matches what the user wants, without leaving the folder.

**Alternate paths**

- More albums exist than fit → the search box is the way to reach them, since only five are shown
  at a time.
- No album matches the search → "No albums found."
- Albums cannot be loaded → the panel shows the error message in place of the list.

**Failure paths**

- Adding or removing fails → the checkbox reverts on the next refresh of the panel.

### J-01-07-2 — Find the other shots that look like this one

**Trigger:** the user suspects there are several near-identical versions of a photo.

1. The user opens the item's menu and chooses **Find similar**.
2. The main pane switches to the similar-images view, seeded with this image and starting at a
   high similarity threshold, and the user can loosen it from there.

**Outcome:** the visually closest images are listed together for comparison. See
[M-05 Search & Discovery](../05-search-and-discovery/README.md).

**Alternate paths**

- The item is a video → **Find similar** is not offered.
- The library has not been indexed for AI search → the results view explains what is missing
  (step 3 of [`../JOURNEYS.md`](../JOURNEYS.md)).

### J-01-07-3 — Work with the file outside the app

**Trigger:** the user wants to copy, back up or edit the original.

1. The user opens the item's menu and chooses **Show in File Explorer**.
2. The operating system's file manager opens at the containing folder with the file selected.
3. Alternatively the user chooses **Copy file path** and pastes the full path wherever it is
   needed.

**Outcome:** the file is reachable with any other tool; the app has changed nothing.

**Failure paths**

- The file has been moved or deleted since the pane was loaded → the file manager cannot select
  it; the failure is logged rather than shown.

### J-01-07-4 — Set an album's cover from inside the album

**Trigger:** the user is looking at an album and wants a different cover.

1. The user opens the actions menu on the photo they want as the cover.
2. Because this is album context, the first two entries are **Set as album cover** and **Remove
   from album**.
3. Choosing **Set as album cover** updates the album immediately, and the album list shows the new
   cover.

**Outcome:** the album is represented by the chosen photo. Album rules live in
[M-06 Albums](../06-albums/README.md).

**Alternate paths**

- The user chooses **Remove from album** → the item leaves the album; the file stays on disk and
  in every other album it belongs to.

### J-01-07-5 — Open the menu on a video

**Trigger:** the user opens the actions menu on a video item.

1. The menu shows Albums, Show in File Explorer and Copy file path as usual.
2. **Find similar** is absent.
3. A greyed-out, unselectable line at the bottom reads "AI analysis is not available for videos
   yet".

**Outcome:** the user learns why the AI-related option is missing instead of wondering.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Actions button | Hovering a thumbnail, or on a list row | A vertical-dots button labelled "Open media item actions" | `packages/media-viewer/src/grid/media-item-actions-menu.tsx` |
| Actions menu | Clicking the button | One row per action, an arrow on Albums, a greyed row for the video notice | `apps/desktop-media/src/renderer/components/DesktopMediaItemActionsMenu.tsx` |
| Albums panel | Choosing Albums | Back chevron, close button, "Find album" box, up to five albums with checkboxes | `apps/desktop-media/src/renderer/components/DesktopMediaItemActionsMenu.tsx` |

**Menu contents by context**

| Context | Actions, in order |
|---|---|
| Folder or search result, image | Albums, Find similar, Show in File Explorer, Copy file path |
| Folder or search result, video | Albums, Show in File Explorer, Copy file path, and the greyed video notice |
| Inside an album, image | Set as album cover, Remove from album, Albums, Find similar, Show in File Explorer, Copy file path |

**UX notes**

- On a grid card the button only becomes visible on hover, so an idle grid stays clean; while its
  menu is open the button and the row's controls stay visible so the pointer cannot lose them.
- The menu is rendered above the rest of the interface and repositioned on scroll and resize, so
  it is never clipped by the grid's scroll area.
- The menu closes on Escape, on a click outside, and after any action except Albums, which
  deliberately keeps it open.
- Clicks inside the menu never reach the thumbnail, so using the menu never opens the viewer.
- The Albums panel shows membership as checkboxes rather than as separate add and remove commands,
  so the current state and the way to change it are the same control.
- No action in this menu is destructive to files. The only removals are from albums, which the
  label makes explicit.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | The menu holds the same core actions for every item, wherever it is shown. | Predictability: users learn one menu. | `apps/desktop-media/src/renderer/components/DesktopMediaItemActionsMenu.tsx` |
| BR-2 | **Set as album cover** and **Remove from album** appear only when the item is being shown inside an album, and are listed first. | A folder item has no album to be removed from, and in an album these are the most likely actions. | `apps/desktop-media/src/renderer/components/DesktopMediaItemActionsMenu.tsx` |
| BR-3 | **Find similar** is offered only for images, and only where the surrounding screen can host the results. | Similarity search is built on image signatures and has no video equivalent. | `apps/desktop-media/src/renderer/components/DesktopMediaItemActionsMenu.tsx` |
| BR-4 | Video items show a disabled line stating that AI analysis is not available for videos yet. | Explains an absence instead of leaving the user to guess. | `apps/desktop-media/src/renderer/components/DesktopMediaItemActionsMenu.tsx` |
| BR-5 | The Albums panel lists at most five albums at a time: albums the item already belongs to first, then recently used albums, then the remainder. | Keeps the menu small while making the likely target reachable without searching. | `apps/desktop-media/src/renderer/components/DesktopMediaItemActionsMenu.tsx` |
| BR-6 | Toggling membership neither closes the menu nor reorders the list. | Adding a photo to three albums should be three clicks, not three menu visits. | `apps/desktop-media/src/renderer/components/DesktopMediaItemActionsMenu.tsx` |
| BR-7 | The album search matches album titles case-insensitively as a substring, and the five-item cap still applies to the filtered list. | Consistent with how the unfiltered list behaves. | `apps/desktop-media/src/renderer/components/DesktopMediaItemActionsMenu.tsx` |
| BR-8 | Adding an item to an album, or removing it, never moves, copies or deletes the file. | Albums are views over the library, not folders. | `apps/desktop-media/src/renderer/actions/album-actions.ts` |
| BR-9 | **Show in File Explorer** asks the operating system to reveal the file; if that fails, the failure is logged and nothing else happens. | A missing file must not produce an error dialog in the middle of browsing. | `apps/desktop-media/electron/ipc/fs-handlers.ts` |
| BR-10 | **Copy file path** copies the item's full path exactly as the app knows it. | The path has to be usable verbatim in another tool. | `apps/desktop-media/src/renderer/components/DesktopMediaItemActionsMenu.tsx` |
| BR-11 | Leaving the Albums panel, or closing the menu, resets it, so the next open starts on the main action list. | The menu should never reopen in a sub-state the user has forgotten about. | `apps/desktop-media/src/renderer/components/DesktopMediaItemActionsMenu.tsx` |
| BR-12 | The menu closes on Escape or on a click outside it. | Standard menu behaviour. | `packages/media-viewer/src/grid/media-item-actions-menu.tsx` |

## 8. Settings & defaults

None — this feature exposes no user settings. The actions offered depend only on the item's kind
(image or video) and on whether it is being shown inside an album.

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Album membership | Local catalog database | Survives restarts; visible in the album and in the checkbox state |
| Album cover | Local catalog database, on the album | The album list shows the chosen photo |
| Recently used albums | Local app state | Determines which albums are offered before searching |
| The similar-images request | Session state only | Lost when the view is closed |

No action in this menu writes to the user's files.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| [M-06 Albums](../06-albums/README.md) | The Albums panel, cover and removal actions | The panel shows an error message instead of the album list |
| [M-05 Search & Discovery](../05-search-and-discovery/README.md) | Find similar | The results view explains that images have not been indexed |
| The operating system's file manager | Show in File Explorer | Nothing opens; the failure is logged |
| Clipboard access | Copy file path | Nothing is copied |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `listAlbumsForMediaItem` | `sourcePath` | Which albums an item belongs to |
| `loadAlbums` | `{ limit }` | The album list offered in the panel |
| `addMediaItemsToAlbum` | `albumId`, `sourcePaths` | Add one or more items to an album |
| `removeMediaItemFromAlbum` | `albumId`, `sourcePath` | Take an item out of an album |
| `setAlbumCover` | `albumId`, `sourcePath` | Make an item the album's cover |
| `revealItemInFolder` (`media:reveal-item-in-folder`) | `filePath` | Reveal the file in the file manager; returns success or an error message |
| `onFindSimilar` | `filePath` | Open the similar-images view seeded from this image |

Album actions are grouped in `apps/desktop-media/src/renderer/actions/album-actions.ts`; the
reveal channel is defined in `apps/desktop-media/src/shared/ipc.ts` and handled in
`apps/desktop-media/electron/ipc/fs-handlers.ts`.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| Component | `apps/desktop-media/src/renderer/components/DesktopMediaItemActionsMenu.test.tsx` | Album ordering (member, then recent, then the rest, capped at five), membership toggling keeping the menu open and the order stable, returning to the main menu and resetting on close, album-only actions appearing first in album context and absent in folder context, Find similar being offered only when the surrounding screen supports it and never for videos, and the set-cover and remove-from-album actions |
| Component | `packages/media-viewer/src/grid/media-item-actions-menu.test.tsx` | The menu shell: rendering above the interface, closing on an outside click and on Escape, and staying open for actions that ask to |
| Unit | `apps/desktop-media/src/renderer/lib/album-list-search-ui.test.ts` | Album search behaviour shared with the album screens |

**Coverage gaps:** there is no automated test for **Copy file path**, for **Show in File
Explorer**, or for the disabled video notice.

## 13. Known limitations & open questions

- **Limitation:** actions apply to one item at a time. There is no way to select several
  thumbnails and add them all to an album, or copy several paths.
- **Limitation:** the Albums panel shows only five albums at a time, so users with many albums must
  search rather than browse, and there is no scrolling through the full list.
- **Limitation:** a new album cannot be created from this menu; the user has to go to the albums
  screen first.
- **Limitation:** adding or removing an album gives no confirmation beyond the checkbox changing,
  and a failure is not surfaced in the menu.
- **Limitation:** the menu has no way to open the item's information, run AI analysis on just this
  photo, rotate it, or delete it — all of those live elsewhere or not at all.
- **Limitation:** on a grid card the actions button only appears on hover, so it is unreachable
  without a pointer.
- **Open question:** the video notice states that AI analysis is not available for videos "yet",
  but the product does not define what video analysis would eventually offer or where it would be
  launched from.

## 14. References

- Module: [Library Browsing & Media Viewer](README.md)
- [Folder media browsing](02-folder-media-browsing.md) — the thumbnails the menu hangs off
- [Star rating](05-star-rating.md) — the other per-item control, kept outside this menu
- [Library roots & folder tree](01-library-roots-and-folder-tree.md) — the folder-level menu
- [M-06 Albums](../06-albums/README.md) — albums, covers and membership rules
- [M-05 Search & Discovery](../05-search-and-discovery/README.md) — the similar-images view
- Shared vocabulary: [`../GLOSSARY.md`](../GLOSSARY.md) — album, media item, find similar
