---
id: F-01-01
module: 01-library-browsing-and-media-viewer
title: Library roots & folder tree
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/hooks/use-folder-tree-handlers.ts
  - apps/desktop-media/src/renderer/components/SidebarTree.tsx
  - apps/desktop-media/src/renderer/components/DesktopFoldersSidebarPanel.tsx
  - apps/desktop-media/electron/ipc/fs-handlers.ts
  - apps/desktop-media/src/renderer/stores/desktop-slice.ts
related:
  - F-01-02
  - F-01-07
---

# Library roots & folder tree

> Point the app at folders you already have on disk, then navigate them in the sidebar exactly
> as they are, without importing, copying or moving a single file.

## 1. Summary

The user adds one or more folders from their disk as **library roots**. Each root becomes the
top of a tree in the **Folders** sidebar that mirrors the real directory structure, and any
folder in that tree can be selected to show its photos and videos in the main pane. Nothing is
copied into an app-managed location: the app reads files where they live, so the same folders
keep working in the file manager and in other tools.

The tree is also where the user learns how far the app has got with a folder. Every row carries
a small status indicator summarising whether the AI pipelines have finished for the images
underneath it, and a per-folder menu is the entry point for scanning and for the AI pipelines
themselves — those actions belong to other modules and are only launched from here. Removing a
library root is a display-only operation: it takes the folder out of the app and never touches
the files.

Adding the first folder is step 1 of the recommended setup path in
[`../JOURNEYS.md`](../JOURNEYS.md); everything else in the product depends on it.

## 2. User stories

- **As a photo owner** I want to add an existing folder and see it appear in the app, **so that**
  I do not have to reorganise my disk before I can use the product.
- **As a browsing user** I want to walk the same folder hierarchy I already know, **so that** I
  never have to guess where the app put my photos.
- **As someone processing a large archive** I want to see at a glance which folders are already
  done, **so that** I can decide what to queue next.
- **As a cautious user** I want removing a folder from the app to be obviously harmless,
  **so that** I can experiment without risking my originals.

This is not a file manager: the tree cannot create, rename, move or delete folders on disk.

## 3. Scope

**In scope**

- Adding and removing library roots
- Expanding, collapsing and selecting folders in the sidebar tree
- Loading a folder's subfolders on demand, and reconciling folders that no longer exist
- The per-folder status indicator and its tooltip
- What happens to the app's state when a root or subtree disappears

**Out of scope**

- The photos and videos themselves — see [Folder media browsing](02-folder-media-browsing.md)
- Running scans and AI pipelines from the folder menu — owned by
  [M-02](../02-catalog-and-metadata/README.md), [M-03](../03-ai-image-analysis/README.md),
  [M-04](../04-people-and-faces/README.md) and [M-05](../05-search-and-discovery/README.md)
- The folder analysis dashboard reached from the folder menu — owned by
  [M-08](../08-insights-and-library-health/README.md)
- Creating or editing folders on disk

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Cataloguing the files inside a folder | [M-02 Catalog & Metadata](../02-catalog-and-metadata/README.md) |
| What the status colours are computed from | [M-09 Background Processing](../09-background-processing/README.md) |
| Duplicate-file checks launched from the folder menu | [M-08 Insights & Library Health](../08-insights-and-library-health/README.md) |
| Settings screens for the options below | [Settings screen](../11-settings-and-configuration/01-settings-screen.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-01-01.1 | Add a library root | A native folder picker; the chosen folder becomes a new tree in the sidebar | shipped |
| F-01-01.2 | Expand and collapse folders | Subfolders are read from disk the first time a folder is opened, then cached for the session | shipped |
| F-01-01.3 | Select a folder | The main pane switches to that folder's media; any active search results are cleared | shipped |
| F-01-01.4 | Folder status indicator | A per-row square or spinner summarising AI progress for everything under that folder, with an explanatory tooltip | shipped |
| F-01-01.5 | Folder row menu | Right-click or the row's menu button opens the folder's scan, AI, summary and duplicate actions | shipped |
| F-01-01.6 | Remove a library root | The root and everything cached about it disappears from the app; files on disk are untouched | shipped |
| F-01-01.7 | Reconcile vanished folders | Subfolders deleted outside the app are dropped from the tree and from stored folder status on the next expand | shipped |

## 5. User journeys

### J-01-01-1 — Add the first library folder

**Trigger:** the user opens the app for the first time and the Folders sidebar is empty.
**Preconditions:** the user has photos in a folder on a local disk.

1. The sidebar shows a single highlighted **Add library folder** button in place of a tree.
2. The user clicks it and picks a folder in the operating system's directory picker
   ("Select media library folder").
3. The folder appears as a new root row, labelled with its full path.
4. Because **After adding a media library root folder, start a full metadata scan** is on by default, a
   recursive folder scan starts immediately in the background and reports progress in the
   progress dock.
5. The user clicks the root row to select it and see its media.

**Outcome:** the library root is registered, survives restarts, and its files are being
catalogued.

**Alternate paths**

- The picker is cancelled → nothing is added and no scan starts.
- At least one root already exists → the add control is a **+** button in the **Folders**
  section header instead of the full-width button.
- The same folder is picked twice → it is not added a second time.
- The setting for scanning on add has been turned off → the root is added only, and the user
  runs **Scan for file changes** from the folder menu when ready.

**Recommendation reflected in the product:** start with one modest folder rather than an entire
archive, as described in step 1 of [`../JOURNEYS.md`](../JOURNEYS.md).

### J-01-01-2 — Navigate to a folder inside a root

**Trigger:** the user wants the photos in a subfolder several levels down.

1. The user clicks the chevron on the root row; the app reads that folder's subfolders and lists
   them indented beneath it.
2. Rows for folders that themselves contain subfolders keep a chevron; rows without get a blank
   space in its place.
3. The user clicks a folder's label. The folder expands if it was collapsed **and** becomes the
   selected folder, so a single click both drills in and shows the media.
4. Repeating this walks down the tree; clicking an expanded row's chevron collapses it again.

**Outcome:** the target folder is selected and its media is streaming into the main pane.

**Alternate paths**

- The clicked folder has no direct photos or videos but does have subfolders → it is expanded
  automatically and, with the default setting, the folder AI summary opens instead of an empty
  grid (see [Folder media browsing](02-folder-media-browsing.md)).
- A subfolder was deleted outside the app since it was last listed → it disappears from the tree
  on this expand, along with anything the app had cached about it.

**Failure paths**

- The folder cannot be read (permissions, disconnected drive) → no children appear; the row
  stays in the tree and can be retried.

### J-01-01-3 — Read a folder's processing state from the tree

**Trigger:** the user wants to know what still needs running before browsing or searching.

1. Each row shows a small icon left of its name.
2. Hovering it gives a sentence describing the state of the whole subtree, for example
   "Subtree: face, photo AI, and search index complete for all images" or "Subtree: face and
   search index complete; image analysis still pending".
3. The user opens the folder menu on a row that is not complete and starts the pipeline that is
   missing, or opens **Folder AI analysis summary** for the detailed breakdown.

**Outcome:** the user can target work at the folders that need it instead of re-running
everything.

**Alternate paths**

- A job is currently running for that folder → the icon becomes a spinner and the tooltip reads
  "AI job in progress for this folder".
- The status has not been loaded yet → a neutral spinner is shown with "Loading folder AI
  status…".

### J-01-01-4 — Remove a library root

**Trigger:** the user no longer wants a folder in the app.

1. The user right-clicks the root row, or clicks its menu button.
2. At the bottom of the menu, below a separator, the only root-specific entry reads
   **Remove (does not delete)**.
3. The row disappears together with the app's cached child lists, expansion state and folder
   status for that subtree.
4. If the selected folder was inside the removed root, the main pane returns to
   "Select a folder to view media".

**Outcome:** the app forgets the folder; every file remains exactly where it was on disk.

**Alternate paths**

- The row is a subfolder rather than a root → the remove entry is not offered; only roots can be
  removed.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Folders sidebar section | Default section on launch, or clicking **Folders** | Section header with **+** when roots exist, scrollable tree | `apps/desktop-media/src/renderer/components/DesktopAppSidebar.tsx` |
| Folder tree | Inside the Folders section | One row per folder: chevron, status icon, label, hover menu button | `apps/desktop-media/src/renderer/components/SidebarTree.tsx` |
| Folder row menu | Right-click a row, or click its menu button | Scan for file changes (with **Include sub-folders**), Folder AI analysis summary, Check duplicate files, the AI pipeline section, and **Remove (does not delete)** on roots | `apps/desktop-media/src/renderer/components/SidebarTree.tsx`, `SidebarTreeFolderActionRow.tsx`, `FolderAnalysisMenuSection.tsx` |
| Empty sidebar | No library roots added yet | Single amber-outlined **Add library folder** button | `apps/desktop-media/src/renderer/components/DesktopFoldersSidebarPanel.tsx` |

**States**

| State | What the user sees |
|---|---|
| No roots | The **Add library folder** button and no tree |
| Root added, not expanded | One row labelled with the full folder path |
| Loading children | The row stays in place; children appear when the folder has been read |
| Status unknown | A neutral grey spinner as the row's status icon |
| Job running for the folder | An amber spinner as the row's status icon |
| Collapsed sidebar | Only the status icons are shown; labels and the row menu are hidden |

**UX notes**

- Root rows are labelled with the **full path** so two folders with the same name stay
  distinguishable; child rows show the folder name only.
- The row's menu button is revealed on hover and pinned open while its menu is open, so the
  pointer can travel to the menu without losing it.
- The menu is positioned at the pointer (or under the button) and clamped into the window, so it
  is never cut off by the sidebar's scroll area.
- Both the chevron and the status icon have text labels or titles for assistive technology; the
  chevron reads "Expand folder" / "Collapse folder" combined with the status sentence.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Adding a library root starts a recursive full folder scan of that root when **After adding a media library root folder, start a full metadata scan** is on (the default). | The rest of the product needs the catalog; doing it on add removes a step the user would otherwise forget. | `apps/desktop-media/src/renderer/hooks/use-folder-tree-handlers.ts` |
| BR-2 | The same folder cannot be added twice as a root. | Duplicate trees would double every count and status. | `apps/desktop-media/src/renderer/stores/desktop-slice.ts` |
| BR-3 | Clicking a folder's label expands it when it is collapsed and expandable, and always selects it; clicking the chevron only expands or collapses. | One click should both drill in and show photos, while still allowing pure navigation. | `apps/desktop-media/src/renderer/components/SidebarTree.tsx` |
| BR-4 | A folder's subfolders are read from disk the first time it is expanded and then reused for the session. | Avoids re-reading directories on every click on large trees. | `apps/desktop-media/src/renderer/hooks/use-folder-tree-handlers.ts` |
| BR-5 | When an expand reveals that previously listed subfolders are gone, those subtrees are dropped from the tree, from cached child lists and from stored folder status; if the selected folder was inside one, the selection and the media pane are cleared. | The tree must not show folders that no longer exist, and stale status would misreport coverage. | `apps/desktop-media/src/renderer/hooks/use-folder-tree-handlers.ts`, `apps/desktop-media/electron/ipc/fs-handlers.ts` |
| BR-6 | Removing a library root removes only app state — the root entry, its expansion, its cached children and its folder status. No file or folder on disk is modified. | Trust: the app is read-only towards the user's originals unless write-back is explicitly enabled. | `apps/desktop-media/src/renderer/hooks/use-folder-tree-handlers.ts` |
| BR-7 | **Remove (does not delete)** appears only on library root rows. | Subfolders are part of a root and cannot be detached individually. | `apps/desktop-media/src/renderer/components/SidebarTree.tsx` |
| BR-8 | Selecting a folder clears the current media list and any active AI search results before loading the new folder. | Prevents a mixture of search results and folder contents in one grid. | `apps/desktop-media/src/renderer/hooks/use-folder-tree-handlers.ts` |
| BR-9 | The status icon is a spinner while a job runs for that folder, a neutral spinner while its status is unknown, and otherwise a square coloured from the subtree rollup: complete, image-analysis-pending, partly done, not done, or no indexed images. | One glance per row has to answer "is this folder done?" without opening anything. | `apps/desktop-media/src/renderer/components/SidebarTree.tsx` |
| BR-10 | When image analysis is the only pipeline still outstanding, the square uses the colour chosen by **Image analysis pending — folder icon** (default "Amber (moderate)"). | Users who deliberately skip the slowest pipeline should not see their whole library flagged as incomplete. | `apps/desktop-media/src/renderer/lib/photo-pending-folder-tint.ts` |
| BR-11 | Expanding a folder refreshes the AI status rollups for the newly visible rows. | Otherwise newly revealed rows would sit on a loading spinner indefinitely. | `apps/desktop-media/src/renderer/hooks/use-folder-tree-handlers.ts` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| After adding a media library root folder, start a full metadata scan | On | Starts a recursive full folder scan immediately after a root is added | No |
| Image analysis pending — folder icon | Amber (moderate) | Colour of the folder square when image analysis is the only step left; the other choices are "Red (urgent)" and "Green (same as fully complete)" | No |

Defined in `apps/desktop-media/src/shared/ipc.ts`
(`DEFAULT_FOLDER_SCANNING_SETTINGS`, `DEFAULT_PHOTO_ANALYSIS_SETTINGS`).

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Library roots | App settings file in the user data folder | The added folders come back after a restart |
| Folder AI status and rollups | Local catalog database | Row indicators reflect real processing history, not just this session |
| Expanded folders, selected folder, cached child lists | Session state only | The tree opens collapsed after a restart, with no folder selected |

Removing a library root discards the app's cached child lists and folder status for that
subtree. The files, and the catalog rows for the media inside them, are not deleted by this
action.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| The folders being readable at their recorded paths | Listing children and streaming media | The row remains but shows no children; selecting it yields an empty pane |
| Local catalog database | Folder status indicators | Rows stay on the neutral "not analyzed" square |
| [M-02 Catalog & Metadata](../02-catalog-and-metadata/README.md) | The scan triggered on add, and the data behind status | Status never progresses past "not done" |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `selectLibraryFolder` (`media:select-library-folder`) | — | Ask the user for a folder and return its path |
| `readFolderChildren` (`media:read-folder-children`) | `folderPath` | List a folder's subfolders, each flagged with whether it has subfolders of its own |
| `pruneFolderAnalysisForMissingChildren` (`media:prune-folder-analysis-for-missing-children`) | `parentPath`, `existingChildren` | Drop stored folder status for children that no longer exist |
| `addLibraryRoot` / `removeLibraryRoot` | `path` | Register or forget a library root |
| `toggleFolderExpand` | `folderPath` | Open or close a row |
| `handleSelectFolder` | `folderPath`, `{ suppressAutoMetadataScan }` | Select a folder and start streaming its media |
| `getFolderAnalysisStatuses` (`media:get-folder-analysis-statuses`) | — | Read the per-folder processing status used by the indicators |

Channel names are defined in `apps/desktop-media/src/shared/ipc.ts`; handlers in
`apps/desktop-media/electron/ipc/fs-handlers.ts`; renderer actions in
`apps/desktop-media/src/renderer/hooks/use-folder-tree-handlers.ts`.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/folder-browsing.spec.ts` | Adding a folder shows it in the tree; clicking it updates the header; removing it from the row menu hides it and returns the empty state |
| E2E | `apps/desktop-media/tests/e2e/app-launch.spec.ts` | The sidebar renders with all section labels and the folder-selection empty state on first launch |
| E2E | `apps/desktop-media/tests/e2e/sidebar-navigation.spec.ts` | Switching away from and back to Folders, and collapsing the sidebar |
| Unit | `apps/desktop-media/src/renderer/lib/is-path-within-parent.test.ts` | The path containment used to decide which subtrees are affected by a removal |
| Unit | `apps/desktop-media/src/renderer/lib/photo-pending-folder-tint.test.ts` | Mapping the pending-image-analysis colour setting to the folder square |
| Unit | `apps/desktop-media/src/renderer/lib/main-app-sidebar-active-section-id.test.ts` | Which sidebar section is treated as active |
| Component | `packages/media-viewer/src/main-app-sidebar.test.tsx` | Sidebar section shell: expansion, labels and header controls |

**Coverage gaps:** there is no automated test for the vanished-subfolder reconciliation on
expand, for the status-icon tooltips, or for the scan that is triggered when a root is added.

## 13. Known limitations & open questions

- **Limitation:** the tree cannot be searched or filtered; reaching a deep folder in a large
  archive means expanding each level.
- **Limitation:** root rows are labelled with the full path, which truncates awkwardly in a
  narrow sidebar; there is no option to show just the folder name.
- **Limitation:** folders are only re-checked against disk when they are expanded, so a folder
  deleted outside the app can stay visible until the parent is collapsed and reopened.
- **Limitation:** the app never watches the file system, so new folders appear only after a
  manual expand.
- **Open question:** removing a library root leaves the catalog rows for its media in the
  database. It is not defined in the product whether those rows should later be cleaned up, or
  what the user should be told about them.

## 14. References

- Module: [Library Browsing & Media Viewer](README.md)
- [Folder media browsing](02-folder-media-browsing.md) — what selecting a folder produces
- [Media item actions](07-media-item-actions.md) — per-item counterpart of the folder row menu
- Recommended setup order: [`../JOURNEYS.md`](../JOURNEYS.md) (J-X1, step 1)
- Shared vocabulary: [`../GLOSSARY.md`](../GLOSSARY.md) — library root, folder tree, folder
  status indicator
