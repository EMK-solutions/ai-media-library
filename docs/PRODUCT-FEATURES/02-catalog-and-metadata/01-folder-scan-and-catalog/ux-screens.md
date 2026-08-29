# Folder scan & catalog — screens & UX

Section 6 of [F-02-01 Folder scan & catalog](README.md), expanded.

The scan has no workspace of its own. It is started from folder menus and observed in the
Background operations dock.

## Surfaces

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Folder row menu | Right-click a folder row in the sidebar, or use its ⋮ button | **Scan for file changes** row with a play control, and an **Include sub-folders** checkbox underneath | `apps/desktop-media/src/renderer/components/SidebarTree.tsx` |
| Folder tree scan card | Folder row menu → **Folder AI analysis summary** → **Folder tree scan** | Freshness figures, a **Quick folder scan** table, and a play control opening the **Full scan** menu | `apps/desktop-media/src/renderer/components/folder-ai-summary/DesktopFolderAiSummaryDashboard.tsx` |
| **Full scan** menu | The play control on the folder scan card | Two items: **Only detected changes** and **Full folder tree** | `apps/desktop-media/src/renderer/components/folder-ai-summary/FolderTreeScanPlayMenu.tsx` |
| Scan progress card | Automatically, in the **Background operations** dock, whenever a scan runs | Phase title, step counter, progress bar, current folder, per-file list, **Cancel scan** | `apps/desktop-media/src/renderer/components/progress-dock/cards/MetadataScanCard.tsx` |
| Location database card | Enabling GPS detection, or a scan needing the database | Download or cache-load status, percentage, dataset progress label | `apps/desktop-media/src/renderer/components/progress-dock/cards/GeocoderInitCard.tsx` |
| Settings section | Settings → **Folder scanning, file metadata and Geo-location** | All of this module's controls | `apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx` |

## Progress card titles by phase

The card retitles itself as the scan moves through its steps, and states the current step out of
three or four. All copy is defined in `apps/desktop-media/src/renderer/lib/ui-text.ts`.

| Phase | Card title | Step label |
|---|---|---|
| Preparing | Media metadata scan - Indexing file identity | Checking files on disk |
| Scanning | Media metadata scan - updating database | Reading metadata and updating database |
| Geocoding (only when GPS detection is on) | Media metadata scan - updating locations | Updating location data from GPS |
| Finalizing | Media metadata scan - finalizing results | Finalizing scan results |
| Idle or complete | Media metadata scan | Metadata scan idle. / Metadata scan completed. |

## States

| State | What the user sees |
|---|---|
| Idle | No scan card in the dock |
| Preparing | Step 1, counting files as their identity is recorded |
| Scanning | Step 2, with the folder currently being read named, and files appearing in the list as they are created, updated or fail |
| Geocoding | Step 3 of 4, counting geocoded items and reporting how many gained location data |
| Finalizing | The last step, a short fixed-length pass with no per-file detail |
| Completed with changes | A summary of created, updated, unchanged, failed and cancelled counts, plus geocoding results when applicable; the card stays until dismissed |
| Completed with no changes | The card removes itself as soon as the scan finishes |
| Cancelled | The remaining files are shown as cancelled and the summary reports them |
| Failed files present | The failing files are named with their error, and remain listed after completion |

## UX notes

- Thumbnails never wait for a scan. A folder is browsable within seconds of selection, and the
  scan enriches what is already on screen.
- Only files that were actually created, updated or failed are pushed to the card's list.
  Unchanged files are counted but not enumerated, which keeps a large no-op scan quiet.
- Per-file updates are batched before reaching the UI, so a fast scan does not flood the dock.
- **Include sub-folders** is a per-folder, per-action choice made in the menu, not a setting. Each
  pipeline row in the folder menu carries its own copy of the checkbox.
- The **Full scan** menu's wording is deliberately asymmetric: **Only detected changes** is the
  cheap, everyday option and **Full folder tree** is the exhaustive one. Both are always
  available; neither is destructive.
- The scan card is hidden while the full-screen viewer is open, along with the rest of the dock.
  The scan keeps running.
- After a scan with catalog changes completes, the currently displayed items refresh their
  metadata in place and the folder status indicators are re-read, so the grid and sidebar reflect
  the new state without the user re-selecting the folder.
- On a large tree the first phase can take a long time with little visible movement, because
  progress is reported per file while the work is organised per folder. This is a known
  limitation, analysed in `docs/ARCHITECTURE/MEDIA-METADATA-SCAN-PROGRESS-DELAY.md`.
