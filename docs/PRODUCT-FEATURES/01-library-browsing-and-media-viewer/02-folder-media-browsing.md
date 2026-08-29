---
id: F-01-02
module: 01-library-browsing-and-media-viewer
title: Folder media browsing
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/DesktopMediaWorkspace.tsx
  - apps/desktop-media/src/renderer/components/DesktopMainToolbar.tsx
  - apps/desktop-media/src/renderer/hooks/use-folder-images-stream.ts
  - apps/desktop-media/electron/ipc/fs-handlers.ts
  - packages/media-viewer/src/grid/media-thumbnail-grid.tsx
related:
  - F-01-01
  - F-01-03
  - F-01-06
---

# Folder media browsing

> Select a folder and its photos and videos start appearing within a moment, in a grid or a
> detail list, however large the folder is.

## 1. Summary

Selecting a folder in the sidebar fills the main pane with the photos and videos that sit
directly in it. The contents arrive progressively rather than all at once: thumbnails appear in
small batches while the folder is still being read, with a counter showing how many have loaded
so far, so a folder with thousands of files is usable long before it has finished loading. Only
the folder's own files are shown — subfolders are browsed by selecting them in the tree.

Two presentations are offered. The **grid** shows large square thumbnails with the file name and
the star rating revealed on hover, and is the fastest way to recognise pictures. The **list**
shows a smaller thumbnail per row with the capture date next to it, in two columns on a wide
window, and is better when the date matters more than the picture.

Browsing a folder is also what quietly builds the catalog for small folders: unless the folder is
large, the app catalogues the files it just streamed as soon as the load finishes, so ratings,
dates and places are available without the user asking for a scan. This is step 1 and part of
step 2 of the recommended setup path in [`../JOURNEYS.md`](../JOURNEYS.md).

## 2. User stories

- **As a browsing user** I want to see a folder's pictures immediately after clicking it,
  **so that** navigating my library never feels like waiting for an import.
- **As someone with very large folders** I want the first thumbnails while the rest still load,
  **so that** I can start working straight away.
- **As someone checking dates** I want a compact list with the capture date beside each file,
  **so that** I can scan chronology without opening every photo.
- **As a new user** I want a clear message when a folder has nothing to show, **so that** I know
  whether the folder is empty or whether my filters are hiding everything.

## 3. Scope

**In scope**

- Streaming and displaying the photos and videos directly inside the selected folder
- Grid and list presentations and the switch between them
- The loading indicator, the item counts and the empty states
- Opening an item in the viewer
- The automatic cataloguing of small folders after a browse
- What happens when the selected folder has no media but does have subfolders

**Out of scope**

- Choosing the folder itself — see [Library roots & folder tree](01-library-roots-and-folder-tree.md)
- Full-screen viewing and slideshow — see [Media viewer & slideshow](03-media-viewer-and-slideshow.md)
- Narrowing what is shown — see [Quick filters](06-quick-filters.md)
- Per-item commands — see [Media item actions](07-media-item-actions.md)
- Search results, which reuse the same grid and list — owned by
  [M-05](../05-search-and-discovery/README.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| The scan that produces dates, ratings and places | [M-02 Catalog & Metadata](../02-catalog-and-metadata/README.md) |
| The pipeline chips and progress shown above the grid | [M-09 Background Processing](../09-background-processing/README.md) |
| The folder analysis summary opened for media-less folders | [M-08 Insights & Library Health](../08-insights-and-library-health/README.md) |
| Rotation review, reached from the same pane | [M-08 Insights & Library Health](../08-insights-and-library-health/README.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-01-02.1 | Progressive folder loading | Thumbnails appear in batches with a live "Loading folder images…" counter | shipped |
| F-01-02.2 | Grid view | Large square thumbnails, two to four per row depending on window width, with hover captions | shipped |
| F-01-02.3 | List view | Compact rows with a small thumbnail, the file name and the capture date, two per row on wide windows | shipped |
| F-01-02.4 | Videos alongside photos | Video files appear in the same grid and list, marked with a play badge and previewed muted | shipped |
| F-01-02.5 | Open an item | Clicking a thumbnail or row opens the media viewer at that item | shipped |
| F-01-02.6 | Empty and filtered-out states | Distinct messages for no folder selected, an empty folder, and everything hidden by filters | shipped |
| F-01-02.7 | Automatic cataloguing of small folders | Files just browsed are catalogued in the background when the folder is below the size threshold | shipped |
| F-01-02.8 | Media-less folder handling | Folders that only contain subfolders expand and show the folder analysis summary instead of an empty grid | shipped |

## 5. User journeys

### J-01-02-1 — Browse a folder for the first time

**Trigger:** the user clicks a folder in the sidebar tree.
**Preconditions:** the folder is a library root or below one.

1. The main pane clears and the toolbar header switches to the folder's path.
2. A pill appears reading "Loading folder images…" followed by how many items have been read so
   far.
3. Thumbnails appear in batches of 24 as the folder is read, so the first pictures are visible
   almost immediately.
4. When the read finishes, the counter disappears and the grid holds every photo and video in
   that folder.
5. Because the folder is smaller than 100 files, the app then catalogues those files in the
   background; capture dates and star ratings fill in on the thumbnails as it does.

**Outcome:** the folder's contents are on screen and catalogued.

**Alternate paths**

- The folder holds 100 files or more → nothing is catalogued automatically; the user runs
  **Scan for file changes** from the folder's row menu.
- A folder scan is already running → automatic cataloguing is skipped so the two do not compete.
- The folder has no photos or videos but does have subfolders → it is expanded in the tree and,
  with the default setting, the folder analysis summary opens instead of an empty grid.
- The folder is genuinely empty → "No images or videos found in selected folder".

**Failure paths**

- The folder cannot be read → loading stops and the pane is left empty.
- The read stalls for more than a few seconds → the app falls back to reading the whole folder in
  one go and shows the result, alphabetically ordered.

### J-01-02-2 — Switch between grid and list

**Trigger:** the user wants dates rather than large pictures, or the reverse.

1. The user clicks the grid or list button in the toolbar; the active one stays highlighted.
2. The same items are re-laid out immediately — no reload, and any active quick filters stay
   applied.
3. In list view each row shows a small thumbnail, the file name and the capture date; in grid
   view the file name appears on hover over the thumbnail.

**Outcome:** the presentation matches the task; the choice persists for the session.

### J-01-02-3 — Open a photo from the folder

**Trigger:** the user finds the picture they were looking for.

1. The user clicks a thumbnail (grid) or a row (list).
2. The media viewer opens at that item, with the whole folder available for navigation.
3. Clicking a video opens the viewer with playback already started.

**Outcome:** the item is open full-size; see
[Media viewer & slideshow](03-media-viewer-and-slideshow.md).

**Alternate paths**

- A quick filter is active → the viewer still navigates the whole folder, not just the visible
  subset. See "Known limitations".

### J-01-02-4 — Understand an empty pane

**Trigger:** the user expected pictures and sees none.

1. With no folder selected at all, the pane reads "Select a folder to view media".
2. With a folder selected that holds no photos or videos, it reads "No images or videos found in
   selected folder".
3. With a folder that does hold media but where every item is filtered out, it reads "No images
   match current filters", and the toolbar's filter button stays highlighted with its badge.

**Outcome:** the user can tell an empty folder from an over-filtered one and knows what to change.

**Alternate paths**

- The folder has only subfolders and the automatic summary has been turned off → the empty
  message is joined by a **Folder tree analysis summary** button.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Media pane | Selecting a folder | Loading pill, thumbnail grid or detail list, empty states | `apps/desktop-media/src/renderer/components/DesktopMediaWorkspace.tsx` |
| Main toolbar | Always above the pane | Folder path, filtered count, pipeline chips, search, filters, grid and list buttons, TV broadcast, more actions | `apps/desktop-media/src/renderer/components/DesktopMainToolbar.tsx` |
| Thumbnail grid | Grid view | Square 256-pixel-high cards, two columns under 768 pixels of window width, three under 1024, four above | `packages/media-viewer/src/grid/media-thumbnail-grid.tsx` |
| Thumbnail card | Grid view | Image or muted video, star rating top left, actions menu top right on hover, dimmed caption overlay on hover | `packages/media-viewer/src/grid/media-item-grid-card.tsx` |
| Detail list row | List view | Small thumbnail, title, capture date, star rating, actions menu | `apps/desktop-media/src/renderer/components/DesktopMediaItemListRow.tsx` |

**States**

| State | What the user sees |
|---|---|
| No folder selected | "Select a folder to view media" |
| Loading | A pill reading "Loading folder images…" with the number loaded, above whatever has arrived |
| Loaded with items | Grid or list of every photo and video directly in the folder |
| Empty folder | "No images or videos found in selected folder" |
| Everything filtered out | "No images match current filters" |
| Thumbnail unavailable | "Preview unavailable" in place of the picture |
| Video not yet in view | A neutral "Video" placeholder until the card comes close to the viewport |

**UX notes**

- The first 24 thumbnails are loaded eagerly; the rest load as they are scrolled towards, and
  video previews only start loading when the card is within roughly a screen of being visible.
- Videos carry a small circular play badge in the corner and are labelled as video items for
  assistive technology; they preview muted and never play sound in the grid.
- Hovering a grid card zooms the picture slightly, darkens it and reveals the file name, the
  actions menu and the full star row — so an unhovered grid stays clean.
- When any quick filter is active the toolbar shows "Filtered: 12/240", making it obvious that
  the pane is not showing everything.
- Above the grid, a strip of pipeline chips reports the counts of images and videos in the folder
  and how far each AI pipeline has got, and links to the folder analysis summary.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Only files directly inside the selected folder are listed; subfolder contents are not included. | The pane mirrors the folder the user picked, so counts and actions are predictable. | `apps/desktop-media/electron/fs-media.ts` |
| BR-2 | A file counts as media when its extension is one of `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`, `.tif`, `.tiff` (images) or `.mp4`, `.mov`, `.m4v`, `.webm`, `.mkv`, `.avi` (videos). Everything else is ignored. | Mixed folders (documents, sidecars, archives) must not clutter the grid. | `apps/desktop-media/src/shared/ipc.ts` |
| BR-3 | The folder is streamed to the pane in batches of 24 items, and the pane redraws at most about twelve times a second while loading. | Keeps the window responsive and the counter smooth on folders with thousands of files. | `apps/desktop-media/electron/ipc/fs-handlers.ts`, `apps/desktop-media/src/renderer/hooks/use-folder-images-stream.ts` |
| BR-4 | If no progress arrives for 12 seconds while a folder is still marked as loading, the app reads the whole folder in one call and finishes the load with that result. | A stalled stream must never leave the user staring at a spinner. | `apps/desktop-media/src/renderer/hooks/use-folder-images-stream.ts` |
| BR-5 | Selecting another folder abandons the previous load: batches belonging to the older request are discarded. | Prevents two folders' contents mixing in one grid. | `apps/desktop-media/src/renderer/hooks/use-folder-images-stream.ts` |
| BR-6 | After a folder finishes loading, its files are catalogued automatically only when the folder holds fewer files than **Automatically scan folder for changes on selection if number of files less than** (default 100), no manual scan is running, and the folder is not a media-less folder that only contains subfolders. | Small folders should just work; large folders must not trigger a long unrequested job. | `apps/desktop-media/electron/ipc/auto-metadata-scan-policy.ts` |
| BR-7 | When a folder finishes loading with no media but does have subfolders, it is expanded in the tree, and the folder analysis summary opens when **On empty folder selection show AI analysis status summary for subfolders** is on (the default). | Clicking a container folder should give useful information instead of an empty grid. | `apps/desktop-media/src/renderer/hooks/use-folder-images-stream.ts` |
| BR-8 | If that setting is off, the empty-folder message is accompanied by a button that opens the same summary on demand. | The information stays one click away without being forced. | `apps/desktop-media/src/renderer/components/DesktopMediaWorkspace.tsx` |
| BR-9 | Grid and list show the same set of items, and any active quick filters apply to both. | Switching presentation must not silently change what is shown. | `apps/desktop-media/src/renderer/components/DesktopMediaWorkspace.tsx` |
| BR-10 | Clicking an item opens the viewer positioned on that item within the folder's full item list; a video starts playing on open. | Navigation in the viewer should cover the folder, not only the clicked thumbnail. | `apps/desktop-media/src/renderer/components/DesktopMediaWorkspace.tsx` |
| BR-11 | Capture dates and star ratings shown on thumbnails and rows come from the catalog, so they appear only once the files have been scanned. | The grid never guesses metadata it has not read. | `apps/desktop-media/src/renderer/hooks/use-folder-metadata-merge.ts` |
| BR-12 | Grid columns are chosen from window width: two below 768 pixels, three below 1024, four above. | Thumbnails stay large enough to recognise at any window size. | `packages/media-viewer/src/grid/media-thumbnail-grid.tsx` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| Automatically scan folder for changes on selection if number of files less than | 100 | Upper bound on folder size for automatic cataloguing after a browse; a folder with this many files or more is skipped | Yes |
| On empty folder selection show AI analysis status summary for subfolders | On | Opens the folder analysis summary when the selected folder has subfolders but no media of its own | No |
| Date format | DD.MM.YYYY | Format of the capture date shown on list rows | No |

Defined in `apps/desktop-media/src/shared/ipc.ts` (`DEFAULT_FOLDER_SCANNING_SETTINGS`,
`DEFAULT_MEDIA_VIEWER_SETTINGS`). Full descriptions in
[Settings screen](../11-settings-and-configuration/01-settings-screen.md).

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| The folder's file list | Read from disk on every selection | The grid always reflects the folder as it is now, with no stale cache |
| Capture dates, star ratings, media kind | Local catalog database | Dates and ratings appear on thumbnails once the folder has been scanned |
| Grid or list choice | Session state only | Resets to grid on the next launch |

Browsing never writes to the user's files. The only write it can trigger is the automatic
catalogue update for small folders, which writes to the app's own database.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| The folder being readable | Listing and displaying files | The pane stays empty after the loading pill disappears |
| Local catalog database | Dates, ratings and media kind on thumbnails | Thumbnails still appear, without dates or ratings |
| [M-02 Catalog & Metadata](../02-catalog-and-metadata/README.md) | Automatic cataloguing after a browse | Dates and ratings never fill in until a scan is run manually |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `startFolderMediaStream` (`media:start-folder-media-stream`) | `folderPath`, `suppressAutoMetadataScan` | Begin streaming a folder's photos and videos |
| `onFolderMediaProgress` (`media:folder-media-progress`) | `started`, `batch`, `completed`, `failed` events | Report load progress and deliver batches |
| `listFolderMedia` (`media:list-folder-media`) | `folderPath` | Read a folder's media in one call, sorted by name |
| `getMediaItemsByPaths` | `paths` | Fetch catalog metadata for the items just streamed |
| `setViewMode` | `grid` or `list` | Switch presentation |
| `openViewer` | `index`, `source` | Open the viewer at an item |

Channel names are defined in `apps/desktop-media/src/shared/ipc.ts`; handlers in
`apps/desktop-media/electron/ipc/fs-handlers.ts`.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/folder-browsing.spec.ts` | Selecting a folder loads thumbnails into the grid and clicking one opens the viewer |
| E2E | `apps/desktop-media/tests/e2e/app-launch.spec.ts` | The "select a folder" empty state on first launch |
| E2E | `apps/desktop-media/tests/e2e/quick-filters.spec.ts` | The filtered-out empty state and the filtered count in the toolbar |
| Unit | `apps/desktop-media/electron/ipc/auto-metadata-scan-policy.test.ts` | When automatic cataloguing after a browse is allowed to run |
| Unit | `apps/desktop-media/src/renderer/lib/photo-date-format.test.ts` | The capture-date label shown on list rows |
| Unit | `apps/desktop-media/src/renderer/lib/media-metadata-lookup.test.ts` | Matching streamed file paths to their catalog metadata |

**Coverage gaps:** there is no automated test for the 12-second stalled-load fallback, for the
media-less folder behaviour, or for the grid's responsive column count.

## 13. Known limitations & open questions

- **Limitation:** items arrive in the order the operating system returns them, not sorted by
  name or date. If the stalled-load fallback kicks in, the folder is shown alphabetically
  instead, so the same folder can be ordered differently on different loads.
- **Limitation:** there is no way to sort or group the pane — no by-date, by-name or by-rating
  ordering, and no grouping by day.
- **Limitation:** thumbnail size is fixed; the only size control is the window width, which
  chooses between two, three and four columns.
- **Limitation:** subfolder contents are never rolled up into the parent, so there is no
  "everything under this folder" browse view.
- **Limitation:** the viewer opened from a filtered grid navigates the folder's full item list,
  so paging forward can reach items the filters had hidden.
- **Limitation:** the pane does not refresh when files change on disk; the folder must be
  reselected.
- **Open question:** the pane supports selecting items in the underlying state, but no
  multi-select interaction or bulk action is exposed in this module. It is undefined which bulk
  operations should eventually be offered here.

## 14. References

- Module: [Library Browsing & Media Viewer](README.md)
- [Library roots & folder tree](01-library-roots-and-folder-tree.md) — choosing the folder
- [Media viewer & slideshow](03-media-viewer-and-slideshow.md) — what a click opens
- [Quick filters](06-quick-filters.md) — narrowing the pane
- [Media item actions](07-media-item-actions.md) — the per-thumbnail menu
- Recommended setup order: [`../JOURNEYS.md`](../JOURNEYS.md) (J-X1, steps 1 and 2)
- Shared vocabulary: [`../GLOSSARY.md`](../GLOSSARY.md) — media item, catalog, folder scan
