---
id: F-01-05
module: 01-library-browsing-and-media-viewer
title: Star rating
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - packages/media-viewer/src/grid/media-item-star-rating.tsx
  - apps/desktop-media/src/renderer/hooks/use-media-item-star-rating-change.ts
  - apps/desktop-media/electron/ipc/media-item-mutation-handlers.ts
  - apps/desktop-media/electron/db/media-item-star-rating-update.ts
  - apps/desktop-media/electron/lib/write-star-rating-exiftool.ts
related:
  - F-01-02
  - F-01-04
  - F-01-06
---

# Star rating

> Give a photo one to five stars wherever you see it, and — if you want — have that rating
> written back into the file so Lightroom and Windows Explorer agree with you.

## 1. Summary

Star rating is the user's own verdict on a photo, from one to five stars, with "unrated" as the
default. It can be set from the thumbnail grid, from a list row, or from the information panel in
the viewer, always with the same control: hover or focus a thumbnail and the compact star badge
expands into five clickable stars plus a clear button. Ratings are read out of the file's embedded
metadata during a folder scan, so a library already rated in another application arrives with its
ratings intact.

Ratings are stored in the app's catalog by default, leaving the original files untouched. Users
who want their ratings to travel can turn on write-back, and every rating change is then also
written into the file's XMP and EXIF metadata in the form Lightroom and the Windows shell expect.
If that file write fails the rating still stands in the app — the catalog is never rolled back.

The rating is not just decorative: it feeds the rating quick filter, keyword search, album
filters, and the ordering of "best of" smart albums, so rating a library makes it materially
easier to find and present the good photos later.

## 2. User stories

- **As someone culling a shoot** I want to rate photos with one click from the grid, **so that**
  I can sort the keepers from the rest quickly.
- **As a Lightroom or Windows user** I want the ratings I already made to show up in the app,
  **so that** years of work is not lost.
- **As someone who values their originals** I want rating to change nothing on disk unless I ask
  for it, **so that** trying the app is risk-free.
- **As someone preparing a slideshow** I want my top-rated photos to lead, **so that** the best
  pictures are the ones people see.

## 3. Scope

**In scope**

- Setting, changing and clearing a rating from the grid, the list and the info panel
- The visual states of the star control, including the compact badge and the rejected marker
- Keyboard rating
- Storing the rating in the catalog
- Optional write-back into the file's embedded metadata
- Where ratings are consumed inside the product

**Out of scope**

- Reading ratings out of files during a scan — owned by
  [M-02 Catalog & Metadata](../02-catalog-and-metadata/README.md)
- The AI's own quality score, which is a separate value — see
  [M-03 AI Image Analysis](../03-ai-image-analysis/README.md)
- Filtering by rating — see [Quick filters](06-quick-filters.md)
- "Best of" smart albums — owned by [M-06 Albums](../06-albums/README.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| The write-back setting and its wider effect on titles and descriptions | [M-11 Settings & Configuration](../11-settings-and-configuration/README.md) |
| Rating tokens in keyword search | [M-05 Search & Discovery](../05-search-and-discovery/README.md) |
| Default rating used by album filters | [M-06 Albums](../06-albums/README.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-01-05.1 | Rate from a thumbnail | Hovering a grid card expands the star control; one click sets the rating | shipped |
| F-01-05.2 | Rate from a list row | The same control on the row, expanded on hover or focus | shipped |
| F-01-05.3 | Rate from the info panel | An always-expanded five-star control at the top of the Info tab | shipped |
| F-01-05.4 | Clear a rating | A clear button, shown only when there is a rating to remove | shipped |
| F-01-05.5 | Keyboard rating | Keys 1 to 5 set a rating; 0, Escape, Backspace or Delete clear it | shipped |
| F-01-05.6 | Compact badge when idle | An unhovered rated thumbnail shows one gold star and the number | shipped |
| F-01-05.7 | Write the rating into the file | With write-back enabled, the rating is mirrored into XMP and EXIF so other tools see it | shipped |
| F-01-05.8 | Rejected marker | A red crossed circle for photos marked rejected in another application | partial |

## 5. User journeys

### J-01-05-1 — Rate photos while culling a folder

**Trigger:** the user is looking at a folder of new photos in the grid.
**Preconditions:** the folder has been scanned, so its files are in the catalog.

1. The user moves the pointer over a thumbnail. The rating control in its top-left corner expands
   into five stars with a clear button beside them.
2. Moving across the stars previews the result: stars that would be added are shown half-lit,
   and if the pointer is below the current rating the stars that would be removed switch to a
   gold outline.
3. The user clicks the fourth star. The rating is saved immediately, and when the pointer leaves
   the card the control collapses to a compact badge reading a gold star and "4".
4. The user repeats this down the folder. Each rating is stored as it is made; there is nothing
   to confirm or save.

**Outcome:** the folder is rated, and the ratings are immediately usable by filters and search.

**Alternate paths**

- The user clicks the star that is already set → nothing changes; to remove a rating the clear
  button (or the 0 key) is used.
- The user is in list view → the same control sits on the row and behaves identically.
- The item has never been catalogued → the app creates its catalog entry first, then applies the
  rating.

**Failure paths**

- The rating cannot be saved → the star does not change and the failure is logged; the user sees
  no change rather than a false rating.

### J-01-05-2 — Rate while viewing a photo large

**Trigger:** the user is examining a photo in the viewer and decides how good it is.

1. The user opens the info panel; the star row sits at the top of the Info tab, always fully
   expanded, with the capture date to its left.
2. Clicking a star saves the rating; the grid behind the viewer shows it as soon as the viewer is
   closed.

**Outcome:** rating and looking closely at a photo happen in the same place. See
[Photo info panel](04-photo-info-panel.md).

### J-01-05-3 — Bring ratings in from another application

**Trigger:** the user adds a library folder that was rated in Lightroom, Bridge or Windows.

1. The user adds the folder and lets the folder scan run
   (see [`../JOURNEYS.md`](../JOURNEYS.md), step 2).
2. As files are catalogued, their embedded ratings are read and shown on the thumbnails.
3. Photos the other application had marked as rejected show a red crossed circle in the info
   panel instead of stars.

**Outcome:** existing rating work carries over without re-rating anything.

**Alternate paths**

- The rating was stored as a percentage rather than as stars → it is converted into the one-to-five
  scale during the scan.

### J-01-05-4 — Make ratings visible to other applications

**Trigger:** the user wants ratings made here to show up in Lightroom or Windows Explorer.

1. The user turns on **Update file metadata on change of Rating, Title, Description** in Settings.
2. From then on, each rating change updates the catalog first — so the interface reacts
   instantly — and the file on disk is updated in the background.
3. Both the standards-based XMP rating and the Windows-friendly EXIF rating are written, so the
   Windows shell's own star display matches.
4. Explorer and Lightroom now show the same stars as the app.

**Outcome:** ratings travel with the files.

**Alternate paths**

- The item is a video → only the XMP rating and timestamps are written, since the EXIF form does
  not apply to video containers.
- Several ratings are changed in quick succession on the same file → the writes are queued per
  file, so the last rating set is the one left on disk.

**Failure paths**

- The file is read-only, locked or the write times out (after 90 seconds by default) → the rating
  remains correct in the app and a warning is logged; the catalog is not rolled back.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Grid thumbnail control | Hovering a thumbnail | Compact badge when idle, five stars plus clear when expanded | `packages/media-viewer/src/grid/media-item-star-rating.tsx` |
| List row control | Hovering or focusing a row | The same control, sized for the row | `apps/desktop-media/src/renderer/components/DesktopMediaItemListRow.tsx` |
| Info panel rating row | Opening the info panel in the viewer | Always-expanded five stars, clear button, and the rejected marker | `apps/desktop-media/src/renderer/components/DesktopViewerInfoRatingRow.tsx` |
| Write-back setting | Settings, file metadata management | "Update file metadata on change of Rating, Title, Description" | `apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx` |

**Values**

| Stored value | Meaning | Where the user sees it |
|---|---|---|
| Not set | Never rated | No badge on the thumbnail |
| 0 | Explicitly unrated or cleared | No badge on the thumbnail |
| 1 to 5 | The user's star count | Compact badge with the number; filled stars when expanded |
| -1 | Rejected, as written by Lightroom-style applications | A red crossed circle in the info panel only |

**UX notes**

- The control is deliberately quiet: an unrated thumbnail shows nothing at all until hovered, so
  a grid of unrated photos is not covered in empty stars.
- The clear button occupies its space even when hidden, so the stars do not shift position when a
  rating is added or removed.
- Clicks and pointer presses on the control never reach the thumbnail, so rating a photo never
  opens the viewer.
- The control is a radio group labelled "Star rating", each star is a radio button labelled "1
  star" through "5 stars", and the clear button is labelled "Clear star rating", so the whole
  control is usable by keyboard and screen reader.
- Rejected photos are shown as rejected in the info panel, but the grid and list deliberately
  hide the marker, because there is no way to mark a photo rejected from within the app yet.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | A rating set in the app must be a whole number from 0 to 5; anything else is refused. Clearing a rating stores 0. | Keeps the value inside the standard star scale that other tools understand. | `apps/desktop-media/electron/ipc/media-item-mutation-handlers.ts` |
| BR-2 | Rejected (-1) can arrive from a file's embedded metadata but cannot be set from the app. | The pick-and-reject workflow has not shipped, so offering the value would be a dead end. | `apps/desktop-media/electron/ipc/media-item-mutation-handlers.ts`, `apps/desktop-media/src/renderer/components/DesktopMediaWorkspace.tsx` |
| BR-3 | The catalog is the authority for everything the app shows, filters and searches. | One value drives every surface, whether or not write-back is enabled. | `apps/desktop-media/electron/db/media-item-star-rating-update.ts` |
| BR-4 | The catalog is updated first and the interface is refreshed straight away; the file on disk is written afterwards in the background. | Rating stays instantaneous even when writing to a large file is slow. | `apps/desktop-media/electron/ipc/media-item-mutation-handlers.ts` |
| BR-5 | A failed file write never rolls back the catalog; the failure is reported but the rating stands. | Losing a rating because a file was locked would be worse than a temporary mismatch. | `apps/desktop-media/electron/ipc/media-item-mutation-handlers.ts` |
| BR-6 | Files are only modified when **Update file metadata on change of Rating, Title, Description** is on; it is off by default. | The app is read-only towards originals until the user opts in. | `apps/desktop-media/src/shared/ipc.ts` |
| BR-7 | For images, write-back sets the XMP rating together with the Windows-compatible EXIF rating and rating percentage, and refreshes the XMP timestamps. For videos, only the XMP rating and timestamps are written. | Ratings have to be visible both in professional tools and in Windows Explorer. | `apps/desktop-media/electron/lib/write-star-rating-exiftool.ts` |
| BR-8 | Writes to the same file are queued one after another, so overlapping rating changes cannot leave an older value on disk. | Rapid re-rating during culling must end in the right value. | `apps/desktop-media/electron/ipc/media-item-mutation-handlers.ts` |
| BR-9 | After a successful write-back the app re-reads the file's identity and updates the catalog accordingly, so the next scan does not treat the rating edit as a content change and discard the AI results. | A rating change must never cost the user hours of AI processing. | `apps/desktop-media/electron/ipc/media-item-mutation-handlers.ts` |
| BR-10 | Setting a rating on a file that is not yet in the catalog adds it first. | Rating a photo should work as soon as it is visible, even before a scan. | `apps/desktop-media/electron/db/media-item-star-rating-update.ts` |
| BR-11 | The clear control is offered only when a rating exists to remove — one to five stars, or rejected where that marker is shown. | Prevents a permanently visible control that would do nothing. | `packages/media-viewer/src/grid/media-item-star-rating.tsx` |
| BR-12 | With the control focused, the keys 1 to 5 set that rating, and 0, Escape, Backspace or Delete clear it. Key presses do not fall through to the viewer. | Fast keyboard culling without competing with the viewer's own shortcuts. | `packages/media-viewer/src/grid/media-item-star-rating.tsx` |
| BR-13 | Changing a rating refreshes the keyword search index for that item, so rating-based searches stay accurate. | Search results must not lag behind the user's ratings. | `apps/desktop-media/electron/db/media-item-star-rating-update.ts` |
| BR-14 | The user's star rating and the AI's quality score are separate values and are never mixed. | The user's judgement must not be silently overwritten by the model's. | `packages/media-metadata-core/src/thumbnail-quick-filters.ts` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| Update file metadata on change of Rating, Title, Description | Off | When on, rating changes are also written into the original file's XMP and EXIF metadata | No |

Defined in `apps/desktop-media/src/shared/ipc.ts` (`DEFAULT_FOLDER_SCANNING_SETTINGS`). The
setting text explains that with it off, edits stay in the database only and original files are not
modified, which is the recommended configuration.

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| The rating | Local catalog database, on the media item | Survives restarts and drives every rating surface |
| A mirrored copy inside the item's metadata record | Local catalog database | Keeps the item's stored metadata self-consistent |
| Search rating tokens | Local keyword search index | Lets searches target unrated, rejected or a specific star count |
| XMP and EXIF rating in the file | The user's file on disk | Only when write-back is enabled; makes the rating visible to other applications |

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Local catalog database | Storing and reading every rating | Ratings cannot be set; stars do not change |
| ExifTool, bundled with the app | Write-back into files | Ratings still work in the app; a warning is logged and the file is unchanged |
| [M-02 Catalog & Metadata](../02-catalog-and-metadata/README.md) | Reading existing ratings out of files | Imported libraries appear unrated until a scan runs |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `setMediaItemStarRating` (`media:set-media-item-star-rating`) | `sourcePath`, `starRating` (0 to 5) | Set or clear a rating; returns the refreshed item metadata and whether a file write was attempted |
| `onMediaItemMetadataRefreshed` (`media:media-item-metadata-refreshed`) | item metadata by path | Push the updated item after a background file write, so the grid stays correct |
| `useMediaItemStarRatingChange` | `sourcePath`, `starRating` | The single renderer entry point used by the grid, the list and the info panel |

Channel names are defined in `apps/desktop-media/src/shared/ipc.ts`; the handler in
`apps/desktop-media/electron/ipc/media-item-mutation-handlers.ts`.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e-standalone/star-rating.spec.ts` | Catalog-only updates with write-back off, on-disk rating and modification time with write-back on, the Windows rating percentage and EXIF rating pairs for one to five stars, and setting a rating by hovering a grid thumbnail |
| Unit | `packages/media-viewer/src/grid/media-item-star-rating.test.ts` | When the clear control is offered, when the rejected marker is shown, and when the compact badge appears |

This spec runs as its own Playwright project rather than as part of the default suite, because it
changes application settings that other specs read.

**Coverage gaps:** there is no automated test for keyboard rating, for the hover preview states,
or for the behaviour when a file write fails.

## 13. Known limitations & open questions

- **Limitation:** ratings can only be set one photo at a time. There is no way to rate a
  selection, and no bulk clear.
- **Limitation:** the app cannot mark a photo as rejected, even though it reads and displays the
  rejected marker set by other applications. There is no pick-and-reject workflow.
- **Limitation:** the rejected marker is hidden in the grid and list, so a rejected photo is
  indistinguishable from an unrated one until its info panel is opened.
- **Limitation:** rating from the keyboard requires the control itself to be focused; there are no
  global rating shortcuts while viewing a photo full screen.
- **Limitation:** when write-back is turned on, existing ratings are not written to disk
  retroactively — only ratings changed afterwards are.
- **Limitation:** a failed file write is only reported in the developer console; the user gets no
  visible warning that the file on disk no longer matches the app.
- **Open question:** if a file's embedded rating changes outside the app after it was rated
  inside the app, it is not defined in the product which value should win on the next scan.

## 14. References

- Module: [Library Browsing & Media Viewer](README.md)
- [Photo info panel](04-photo-info-panel.md) — the always-expanded rating control
- [Quick filters](06-quick-filters.md) — filtering by rating, and why the AI rating is separate
- [M-06 Albums](../06-albums/README.md) — "best of" ordering and album rating filters
- [M-05 Search & Discovery](../05-search-and-discovery/README.md) — rating tokens in keyword search
- Shared vocabulary: [`../GLOSSARY.md`](../GLOSSARY.md) — star rating, write-back, EXIF / XMP
