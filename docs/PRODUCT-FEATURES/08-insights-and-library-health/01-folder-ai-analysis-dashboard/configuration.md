# Folder AI analysis dashboard — configuration

Sections 8–9 for [F-08-01](README.md).

## Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| On empty folder selection show AI analysis status summary for subfolders | On | Selecting a folder with no direct media and at least one child opens this dashboard | No |
| Automatically show this summary on empty folder selection | On | Same store key, offered on the dashboard | No |
| Mark folder scan outdated after (days) | 30 | Turns the scan card amber when the oldest scan in the tree is older than this | No |
| Detect location from GPS | Off | Changes whether geo Play also plans a metadata pass; GPS columns still show coordinates already in the catalog | No |
| Date format | `DD.MM.YYYY` | Formats "Last file change" and outdated-scan dates | No |

Empty-folder auto-open: `DEFAULT_FOLDER_SCANNING_SETTINGS.showFolderAiSummaryWhenSelectingEmptyFolder`
in `apps/desktop-media/src/shared/ipc.ts`. Outdated-after and GPS detection are owned by
[M-02](../../02-catalog-and-metadata/README.md) / [M-11](../../11-settings-and-configuration/README.md)
but drive this screen. Rotation confidence (default 0.9) is owned by
[Wrong rotation detection](../../03-ai-image-analysis/03-wrong-rotation-detection.md) and changes
the wrongly-rotated count on the rotation card.

Card visibility flags in `DEFAULT_FOLDER_AI_SUMMARY_CARD_VISIBILITY` default to all visible; there
is no Settings UI to hide individual cards.

## Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Image / video counts | Catalog overview for the selected scope | The two count cards |
| `metadata_scanned_at` per folder | Folder analysis status | Scan card coverage and "folders missing full scan" |
| Latest `metadata_extracted_at` | `media_items` | **Last file change** |
| Pipeline done / failed / totals | Completion and failure timestamps on `media_items` / embeddings | Card glyphs and percents |
| Rotation issue count | Orientation findings above the confidence threshold, not dismissed | **Wrongly rotated** line and the review link |
| GPS and location-details counts | Catalog geo fields | Geo-location card |
| Auto-open preference | Folder scanning settings in app data | Survives restart |

Removing a library root does not delete files; the dashboard simply has nothing to open for that
path. Coverage is always "as of the catalog", which is why the note
**Based on last folders scan and AI analysis timestamps in database** exists in UI copy (the
header currently leads with title/path rather than repeating that sentence).
