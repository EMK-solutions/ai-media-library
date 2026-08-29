# Folder AI analysis dashboard — screens & UX

Screens for [F-08-01](README.md).

## Screens

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Summary dashboard | Folder ⋮ **Folder AI analysis summary**; Insights hub; empty-folder auto-open; Analysis strip **Analysis** | Title, path, Refresh, Close; Images/Videos; File scan and metadata; Images: pipeline cards; auto-open checkbox | `apps/desktop-media/src/renderer/components/folder-ai-summary/DesktopFolderAiSummaryDashboard.tsx` |
| Summary shell | Same | Tabs, sticky header, geo download dialog | `apps/desktop-media/src/renderer/components/DesktopFolderAiSummaryView.tsx` |
| Subfolders → AI analysis pipelines | **Subfolders** tab | Rows: Total with sub-folders, This folder without sub-folders, one recursive row per immediate child | `apps/desktop-media/src/renderer/components/DesktopFolderAiSummaryTable.tsx` |
| Subfolders → Quick folder scan | Nested tab under Subfolders | New / Modified / Removed / Moved / Folders with media / Scan status | `apps/desktop-media/src/renderer/components/DesktopFolderQuickScanSummaryTable.tsx` |
| Face detection tab | **Face detection** | Faces found/tagged, suggested matches, people-per-image buckets | `apps/desktop-media/src/renderer/components/DesktopFolderFaceSummaryTable.tsx` |
| Geo-location tab | **Geo-location** | GPS Location extracted, Files with GPS, Location from file path by LLM | `apps/desktop-media/src/renderer/components/DesktopFolderGeoSummaryTable.tsx` |
| Insights library pick hub | Insights child rows when >1 root, or after Back from a single-root open | Title, root cards (short name + full path) | `apps/desktop-media/src/renderer/components/insights/desktop-insight-library-pick-hub.tsx` |
| Pipeline explainer | Info control on a card | Short slides (face, rotation, folder scan, geo) | `apps/desktop-media/src/renderer/components/folder-ai-summary/PipelineOnboardingModal.tsx` |
| Scan Play menu | Play on Folder tree scan when coverage is partial | **Full scan** → **Only detected changes** / **Full folder tree** | `apps/desktop-media/src/renderer/components/folder-ai-summary/FolderTreeScanPlayMenu.tsx` |
| Geo download confirm | First geo Play without a local database | ~2 GB GeoNames; OK / cancel | `DesktopFolderAiSummaryView.tsx` |

## States

| State | What the user sees |
|---|---|
| Card still loading | Spinner only — not `0`, `—`, or the word Pending |
| Details tab first open | Large spinner (`Loading summary…` as the accessible name); no placeholder table |
| Pipeline running for this folder | Play replaced by a spinner; title "… is running" |
| Pipeline queued for this folder | Hourglass; title "… is waiting in queue" |
| Scan card red | Folders missing a full scan, or files to add/update |
| Scan card amber | Tree is fully scanned but the oldest scan is older than the outdated-after setting (default 30 days) |
| Scan card green | Quick scan agrees the tree is current |
| No images | Pipeline cards show **No images** |
| Load error | **Could not load folder summary.** |

## UX notes

- Green check = complete; amber percent = partial; dash = not done or not applicable. Failed
  counts are a separate red/amber line, not a substitute for coverage.
- Dashboard Play is tree-wide. The media-header Analysis strip remains **direct images only**
  (`DesktopFolderAiPipelineStrip.tsx`) and is hidden while the summary is open.
- Child folder names in the Subfolders table open this same view for that child.
- **View wrongly rotated images** on the rotation card appears only when the wrongly-rotated
  count is greater than zero.
- Failed counts in table cells open the failed-files list (F-08-04), not a retry dialog.
- Closing the viewer is unrelated; this view is a main-pane mode, not an overlay. The progress
  dock stays available unless the photo viewer is open.
