# Duplicate files — screens & UX

Screens for [F-08-02](README.md).

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Insights sub-nav | Sidebar **Insights** | Folder analysis status, Wrongly rotated images, Duplicate files | `apps/desktop-media/src/renderer/components/insights/desktop-sidebar-insights-section.tsx` |
| Library pick hub | Duplicate files / rotation / folder analysis when >1 root | Title, empty message, root cards | `apps/desktop-media/src/renderer/components/insights/desktop-insight-library-pick-hub.tsx` |
| Scanning shell | After enqueue, until results | Back, **Duplicates in folder**, By folder / By file (loading) | `apps/desktop-media/src/renderer/components/duplicate-files/desktop-duplicate-files-scanning-shell.tsx` |
| By folder | Default after results | Inside vs outside sections; click a folder to filter By file | `apps/desktop-media/src/renderer/components/duplicate-files/duplicate-files-by-folder-panel.tsx` |
| By file | Toggle, or drill-down from a folder | Two columns, thumbnails, size, date, marks, pagination (48 per page) | `apps/desktop-media/src/renderer/components/duplicate-files/desktop-duplicate-files-workspace.tsx` |
| Result row | By file | Scoped path vs matching paths; weak-match note; different-name hint | `apps/desktop-media/src/renderer/components/duplicate-files/duplicate-files-result-row.tsx` |
| Delete confirm | Column trash with marks | Counts, size, Recycle Bin checkbox | `apps/desktop-media/src/renderer/components/duplicate-files/DuplicateFilesDeleteConfirmDialog.tsx` |
| Dock card | Scan or delete running | **Check duplicate files — path** / **Delete duplicate files (N)** | `apps/desktop-media/src/renderer/components/progress-dock/PipelineQueueCards.tsx` |

## States

| State | What the user sees |
|---|---|
| Empty library | Hub empty copy |
| Scanning | Shell with loading By folder panel |
| No pairs after scan | By file empty: no duplicates with the same catalog hash |
| Filter from a folder with no rows | **No rows match the current filter.** |
| Weak match | Amber: duplicate based on file name, size and date; no content hash |
| Delete in progress | Column trash disabled; dock shows the delete job |
| Confirm busy | Dialog **Ok** waits on enqueue |

## UX notes

- Section titles switch between "folder" and "folder tree" depending on whether the selection
  has subfolders (`duplicate-files-ui-copy.ts`).
- **By folder** is the default. Back from By file is **Back to duplicate folders**; from By
  folder it is **Exit duplicates view**.
- Duplicate files and similar-images workspaces are mutually exclusive in the main pane
  (`DesktopAppMain.tsx`).
- Pagination reuses the album page size of 48.
