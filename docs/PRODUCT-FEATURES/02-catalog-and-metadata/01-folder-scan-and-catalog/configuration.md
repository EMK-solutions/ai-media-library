# Folder scan & catalog — settings and data

Sections 8 and 9 of [F-02-01 Folder scan & catalog](README.md), expanded.

## Settings & defaults

All of these live in Settings → **Folder scanning, file metadata and Geo-location**. Defaults are
defined in `apps/desktop-media/src/shared/ipc.ts` (`DEFAULT_FOLDER_SCANNING_SETTINGS` and
`DEFAULT_PATH_EXTRACTION_SETTINGS`); the controls are rendered by
`apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx`. Controls marked advanced
are hidden while **Hide advanced settings** is on, which is the default.

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| After adding a media library root folder, start a full metadata scan | On | A newly added root is scanned recursively without a second action. Turn off to start every scan by hand. | No |
| Automatically scan folder for changes on selection if number of files less than | 100 | Selecting a folder with fewer than this many direct media files scans that folder's own files. At or above the value, no automatic scan; thumbnails still load. Set to 0 to disable. | Yes |
| Mark folder scan as outdated after | 30 days | The folder scan card is highlighted in amber when the oldest folder scan in the tree is older than this. Range 1–365. | No |
| On empty folder selection show AI analysis status summary for subfolders | On | Selecting a folder that has subfolders but no direct media opens the folder summary instead of an empty grid. Ignored when the folder has no subfolders. | No |
| Detect Country / City from GPS coordinates on folder scan | Off | Adds the geocoding step to every scan and resolves country, state/province and city for images with coordinates. First activation downloads roughly 2 GB of location data. See [Location metadata](../04-location-metadata.md). | No |
| Extract date(s) from file path | On | Runs the rule-based date and title reader over each file's path during the scan. See [Path-based metadata extraction](../05-path-based-metadata-extraction.md). | No |
| Quick scan: detect moved files using | Filename + byte size | How a removed catalog path is paired with a new file on disk as a move. The alternative compares SHA-256 content hashes: slower, fewer false pairs. See [File identity & change tracking](../02-file-identity-and-change-tracking.md). | Yes |
| Update file metadata on change of Rating, Title, Description | Off | Mirrors a rating the user sets in the app back into the file. See [Embedded metadata write-back](../06-embedded-metadata-write-back.md). | No |
| Detect location and dates from file paths using AI (LLM) | Off | Adds **Extract path metadata (LLM)** to the folder menu, plus fields for the primary and fallback model ids (defaults `qwen2.5vl:3b` and `qwen3.5:9b`). | Yes |

A **Reset to defaults** button restores the whole section, and is disabled while every value
already matches its default.

### Recommended order

Enable **Detect Country / City from GPS coordinates on folder scan** *before* the first scan of a
library whose photos carry coordinates. Place names are then resolved in the same pass. Enabling it
afterwards works — a later scan backfills every catalogued item with coordinates, not just newly
changed ones — but it means reading the tree a second time and downloading a large database at a
point where attention has moved on.

## Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| One entry per file path | `media_items` | The app knows this file. Removing it from the catalog does not touch the file. |
| Dimensions and orientation | `media_items.width`, `.height`, `.orientation` | Drives thumbnail layout, and decides whether a file's change invalidates AI results |
| Capture date and its precision | `media_items.photo_taken_at`, `.photo_taken_precision` | The date shown in the info panel and list view; precision lets a year-only date display as a year |
| Resolved event date | `media_items.event_date_start`, `.event_date_end`, `.event_date_precision`, `.event_date_source` | The date filters and smart albums use. See [Date metadata](../03-date-metadata.md) |
| File dates and size | `media_items.file_created_at`, `.file_mtime_ms`, `.byte_size` | Fallback date, and the cheap check that decides whether a file needs re-reading |
| Coordinates and place names | `media_items.latitude`, `.longitude`, `.country`, `.city`, `.location_area`, `.location_area2`, `.location_place`, `.location_source` | Where the photo was taken, and which source that came from. See [Location metadata](../04-location-metadata.md) |
| Star rating | `media_items.star_rating` | The user's own 0–5 rating, read out of the file's embedded metadata and editable in the app |
| Media kind and video duration | `media_items.media_kind`, `.video_duration_sec` | Whether an item is a photo or a video, and how long it runs |
| Content fingerprint | `media_items.content_hash`, `.checksum_sha256` | Lets the app recognise the same file after a move, and find exact duplicates. Not computed for files over 128 MiB |
| Duplicate group | `media_items.duplicate_group_id` | Which other files have identical content |
| Extraction stamp and version | `media_items.metadata_extracted_at`, `.metadata_version`, `.metadata_error` | When the file was last read, with which format, and whether reading failed |
| Deletion marker | `media_items.deleted_at` | The file is no longer on disk. The entry is kept, so a returning file recovers its ratings, faces and descriptions |
| Camera, lens, exposure and embedded text | `media_items.ai_metadata` (`file_data.technical.capture`, `file_data.exif_xmp`) | The Metadata tab in the viewer, and the camera details in the info panel |
| Per-file identity record | `fs_objects` | The move, rename and duplicate tracking described in [File identity & change tracking](../02-file-identity-and-change-tracking.md) |
| Known paths for an item | `media_item_sources` | Which paths the same catalog entry has been seen at |
| Per-folder scan timestamp | folder analysis status rows | Drives the folder dashboard's freshness figures and the outdated highlight |
| Quick scan snapshot | `folder_quick_scan_snapshot` | Baseline for the fast folder-tree comparison |

All of it is stored in the local database, whose location is shown in Settings under
**Application data files**. Nothing is uploaded, and nothing is written into the user's media files
by a scan.

### Lifecycle

- A scan **creates** an entry for a file it has not seen at that path before.
- A scan **updates** an entry when the file's size, modification time, fingerprint or the app's
  metadata format has changed.
- A scan **marks deleted** an entry whose file is no longer in the folder, and **restores** it if
  the file comes back.
- Entries marked deleted for more than 30 days can be permanently removed, along with their faces,
  search vectors, album memberships and tags. Specific already-deleted entries can also be removed
  on demand.
