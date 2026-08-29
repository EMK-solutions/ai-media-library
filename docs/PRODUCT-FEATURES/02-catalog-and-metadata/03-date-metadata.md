---
id: F-02-03
module: 02-catalog-and-metadata
title: Date metadata
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - packages/media-metadata-core/src/storage/mwg-photo-metadata.ts
  - packages/media-metadata-core/src/storage/media-metadata-shared.ts
  - apps/desktop-media/electron/path-extraction/event-date-resolver.ts
  - apps/desktop-media/electron/db/media-item-path-extraction.ts
  - apps/desktop-media/src/renderer/lib/photo-date-format.ts
related:
  - F-02-01
  - F-02-05
---

# Date metadata

> When was this taken? The app answers with the best date it can find, and tells you when the
> answer came from the folder name rather than the camera.

## 1. Summary

Dates are how most people navigate a photo library. A digital camera embeds the exact capture
moment in the file, so for recent photos the answer is easy. Scans of old prints are the hard case:
the file was created in 2019 but the photograph is from 1974, and only the folder name — `1974
Grandparents wedding` — knows that.

This feature keeps those two answers separate and uses each where it belongs. The **capture date**
comes out of the file's own metadata and is shown as **Date taken**. The **event date** is the
app's best judgement of when the depicted event happened, and it is what year filters search on.
When a photo's folder or filename points at an earlier year than the file's own metadata, the event
date follows the path and the viewer says so with an amber **Date extracted from file path**
notice, so the user is never quietly shown a guess as if it were fact.

Dates that are only partly known are supported throughout. A file that says only `1974` is stored
as `1974`, displayed as `1974`, and matched by a year filter for 1974 — it is not silently
promoted to 1 January.

## 2. User stories

- **As someone with scanned family photos** I want the app to date them by the event, not by when I
  scanned them, **so that** browsing by year makes sense.
- **As someone reviewing a photo** I want to know whether its date came from the camera or was
  inferred, **so that** I can trust or correct it.
- **As someone searching** I want a year range filter that finds old scans too, **so that** photos
  without capture metadata are not invisible.
- **As someone with photos dated only by year** I want that partial date shown honestly, **so that**
  I am not misled by a fabricated day and month.

## 3. Scope

**In scope**

- Reading capture dates from image and video files, including partial year and year-month dates
- Recording the file's own creation time as a fallback
- Resolving the event date from capture date, path-derived date and file time
- Recording which of those the event date came from
- Showing dates in the viewer, the info panel and grid rows, in the user's chosen date format
- Filtering by event year range in the quick filters and in search

**Out of scope**

- Extracting dates from folder and file names — see
  [Path-based metadata extraction](05-path-based-metadata-extraction.md)
- Editing a photo's date by hand; the app has no date editor
- Writing a corrected date back into the file — see
  [Embedded metadata write-back](06-embedded-metadata-write-back.md), which covers ratings only
- Dates the AI reads out of the picture itself, such as a date printed on an invoice

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Choosing the date display format | [Settings & Configuration](../11-settings-and-configuration/README.md) |
| Year-range filtering in search results | [Search & Discovery](../05-search-and-discovery/README.md) |
| Year and place smart albums | [Albums](../06-albums/README.md) |
| Dates read out of document images | [Documents](../07-documents/README.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-02-03.1 | Capture date reading | **Date taken** for photos and videos, from the file's own metadata | shipped |
| F-02-03.2 | Partial date support | A photo known only to the year or month is stored and shown that way | shipped |
| F-02-03.3 | Event date resolution | A single best browsing date per photo, favouring the older path-derived year for scans | shipped |
| F-02-03.4 | Date provenance | **Date precision** in the info panel, and an amber notice when the date came from the path | shipped |
| F-02-03.5 | Event year filtering | **Event years (database)** quick filter with **From year** / **To year** | shipped |
| F-02-03.6 | Date display formatting | All date labels follow the chosen format | shipped |

## 5. User journeys

### J-02-03-1 — Browse scanned family photos by the year they were taken

**Trigger:** the user scans a folder of digitised prints organised as `1974 Grandparents wedding`.
**Preconditions:** **Extract date(s) from file path** is on (the default).

1. The scan reads each file. The scanner wrote no capture date, or wrote the digitisation date.
2. Because the path says 1974 and that is earlier than anything in the file, the event date becomes
   1974 with year precision.
3. Opening a photo shows **1974** as the headline date with an amber **Date extracted from file
   path** notice underneath.
4. The user opens the quick filters, ticks **Event years (database)** and sets **From year** 1970
   and **To year** 1979. The grid narrows to that decade.

**Outcome:** photos with no usable capture metadata are still browsable by the year they depict.

**Alternate paths**

- The folder is named `1974-06 Wedding` → the event date is 1974-06 with month precision, and the
  headline date reads as June 1974 in the chosen format.
- The folder name gives a span such as `1974-06-01 -- 1974-06-08` → both a start and an end date
  are recorded, and the year filter matches any year the span touches.
- **Extract date(s) from file path** is off → no event date is recorded at all, and the
  **Event years (database)** filter matches nothing for these photos.

**Failure paths**

- The folder carries no recognisable date and the files have no capture date → the event date falls
  back to the file's creation time, which for scans is the digitisation date. The photos sort with
  recent material.

### J-02-03-2 — Check where a photo's date came from

**Trigger:** a date looks wrong and the user wants to know why.

1. The user opens the photo and the **Info** panel.
2. **Capture data** shows **Date taken** and **Date precision**; **File data** shows **File date**.
3. If the headline date differs from **Date taken**, the amber notice explains it came from the
   path.

**Outcome:** every date on screen can be traced to a source.

**Alternate paths**

- The file has no capture date → **Date taken** is empty and grid rows fall back to the file date.
- The capture date is partial → **Date precision** reads `year` or `month`.

### J-02-03-3 — Modern camera photos, nothing to think about

**Trigger:** the user scans a folder straight off a phone or camera.

1. Each file carries a full capture timestamp, so the capture date is exact.
2. The event date matches it, because no path date is older.
3. Dates appear everywhere with no warnings, and year filters work immediately.

**Outcome:** the common case needs no user attention.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Viewer headline date | Open any photo | The date above the star rating, plus an amber **Date extracted from file path** notice when the path date won | `apps/desktop-media/src/renderer/components/DesktopViewerInfoPanel.tsx` |
| Info panel — Capture data | Viewer → **Info** | **Date taken**, **Date precision** | `apps/desktop-media/src/renderer/components/DesktopViewerInfoPanel.tsx` |
| Info panel — File data | Viewer → **Info** | **File date** | `apps/desktop-media/src/renderer/components/DesktopViewerInfoPanel.tsx` |
| Grid and list date labels | Any folder or album view | Capture date, or the file date when there is none | `apps/desktop-media/src/renderer/lib/photo-date-format.ts` |
| Quick filters | Filter button above the grid | **Event years (database)** with **From year** and **To year** | `apps/desktop-media/src/renderer/components/QuickFiltersMenu.tsx` |

**States**

| State | What the user sees |
|---|---|
| Exact capture date | Full date in the chosen format; no notice |
| Year-only date | The bare year, and **Date precision** reads `year` |
| Month precision | Month and year, and **Date precision** reads `month` |
| Path date used | The path-derived date plus the amber notice |
| No date at all | The file date; if that is missing too, an em dash |

**UX notes**

- Year and month dates are never expanded to a full date on screen, because that would invent
  precision the source did not have.
- Date labels in lists never include a time of day.
- Dates are formatted in UTC, so a photo taken late in the evening in a far time zone can show the
  neighbouring calendar day.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | The capture date is taken from the file's XMP creation fields first, and only then from the EXIF original date. | XMP is where cataloguing software records a corrected or partial date; it represents a human decision and should outrank the camera's raw value. | `packages/media-metadata-core/src/storage/media-metadata-shared.ts` |
| BR-2 | A capture date may be a bare year, a year and month, a calendar day, or an exact instant, and its precision is recorded alongside it. | Scanned and archival material genuinely is only known to a year; storing a fake day would corrupt filtering and sorting. | `packages/media-metadata-core/src/storage/mwg-photo-metadata.ts` |
| BR-3 | Partial dates are accepted only for years between 1850 and 2100. | Rejects nonsense values that appear in damaged metadata. | `packages/media-metadata-core/src/storage/mwg-photo-metadata.ts` |
| BR-4 | For videos, the capture date is taken from the first available of the original date, creation date, media creation date, track creation date, creation date field and modification date. | Video containers scatter the capture moment across several fields depending on the recording device. | `apps/desktop-media/electron/lib/extract-video-metadata-exiftool.ts` |
| BR-5 | The event date is the capture date, unless a path-derived date exists whose calendar year is earlier, in which case the path date wins. | The scanned-print case: the file is new, the photograph is old, and only the path knows. | `apps/desktop-media/electron/path-extraction/event-date-resolver.ts` |
| BR-6 | With no capture date, the event date is the path-derived date; with neither, it is the file's creation time at day precision. | Every photo should be placeable on a timeline, even approximately. | `apps/desktop-media/electron/path-extraction/event-date-resolver.ts` |
| BR-7 | The event date records which source produced it, distinguishing the file's EXIF date, its XMP date, a rule-based path date, an AI-read path date and the file time. | Lets the app explain the date and lets a later, better source replace a weaker one. | `apps/desktop-media/electron/path-extraction/event-date-resolver.ts` |
| BR-8 | The event date is only ever written by path extraction. When **Extract date(s) from file path** is off, no event date is recorded for newly scanned files. | Event date resolution lives in the path extraction step; there is no separate pass that would fill it from capture dates alone. | `apps/desktop-media/electron/db/media-item-path-extraction.ts`, `apps/desktop-media/electron/ipc/metadata-scan-handlers.ts` |
| BR-9 | An event year filter matches a photo when the filter range overlaps the photo's event start and end years. A photo with no event date never matches. | Date spans must be included by any filter touching them, not just by their first year. | `packages/media-metadata-core/src/thumbnail-quick-filters.ts` |
| BR-10 | The viewer prefers the path date over the capture date only when the path date's year — or year and month, when the path date is more precise than a year — is earlier than both the capture date and the file date. | Mirrors the stored resolution so the viewer never contradicts the filters. | `apps/desktop-media/src/renderer/components/DesktopViewerInfoPanel.tsx` |
| BR-11 | Grid and list labels use the capture date, falling back to the file date, then to the file's modification time, then to an em dash. | A row should always show something recognisable as a date. | `apps/desktop-media/src/renderer/lib/photo-date-format.ts` |
| BR-12 | Album date filters and the year-based smart albums use the capture date falling back to the file date, not the event date. | Current implementation; see the open question in section 13. | `apps/desktop-media/electron/db/media-albums.ts` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| Extract date(s) from file path | **On** | Enables the step that derives dates from paths and writes the event date. With it off, event dates and the **Event years (database)** filter stay empty. | No |
| Date format | **DD.MM.YYYY** | The format all date labels use. Alternatives are `YYYY-MM-DD` and `MM/DD/YYYY`. | No |

**Extract date(s) from file path** lives in Settings → **Folder scanning, file metadata and
Geo-location** (`apps/desktop-media/src/shared/ipc.ts`,
`DEFAULT_PATH_EXTRACTION_SETTINGS`). **Date format** lives in Settings → **Image / Video viewer**
(`DEFAULT_MEDIA_VIEWER_SETTINGS`) and is owned by
[Settings & Configuration](../11-settings-and-configuration/README.md).

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Capture date and its precision | `media_items.photo_taken_at`, `media_items.photo_taken_precision` | **Date taken** and **Date precision** |
| File creation time | `media_items.file_created_at` | **File date**, and the last-resort display date |
| Event date span | `media_items.event_date_start`, `media_items.event_date_end`, `media_items.event_date_precision` | The date year filters search on |
| Event date source | `media_items.event_date_source` | Whether the date came from the file, the path or the file time |
| Path-derived date detail | `ai_metadata.path_extraction.date` | The exact text in the path that produced the date, and how deep in the folder tree it was found |

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| [Folder scan & catalog](01-folder-scan-and-catalog/README.md) | Any date at all | No dates; nothing is in the catalog yet |
| [Path-based metadata extraction](05-path-based-metadata-extraction.md) | Event dates, and dating scanned material correctly | Dates limited to what the files themselves say |
| ExifTool, bundled with the app | Video capture dates | Videos keep an empty **Date taken** and fall back to the file date |
| Readable XMP inside the file | Partial and corrected dates | Only the camera's own exact timestamp is available |

## 11. Automatable actions & API surface

Dates have no dedicated channel. They are produced by `media:scan-folder-metadata` and
`media:analyze-folder-path-metadata`, read back through `media:get-media-items-by-paths`, and
filtered through the event date range fields accepted by the search channels. Defined in
`apps/desktop-media/src/shared/ipc.ts`.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| Unit | `apps/desktop-media/electron/path-extraction/event-date-resolver.test.ts` | Event date precedence, including the earlier-path-year rule and the file-time fallback |
| Unit | `apps/desktop-media/electron/path-extraction/date-extractor.test.ts` | The date patterns recognised in filenames and folder names |
| Unit | `apps/desktop-media/src/renderer/lib/photo-date-format.test.ts` | Partial-precision display, fallback order and date formats |

**Coverage gaps:** the XMP-before-EXIF preference, the year bounds on partial dates, video capture
date field order, and the event year overlap filter have no direct automated coverage.

## 13. Known limitations & open questions

- **Limitation:** dates cannot be edited. A wrong date can only be fixed by editing the file's
  metadata or renaming its folder in another tool and re-scanning.
- **Limitation:** event dates depend entirely on path extraction. Turning **Extract date(s) from
  file path** off leaves every newly scanned photo without an event date and therefore invisible to
  the **Event years (database)** filter, even when its capture date is perfectly good.
- **Limitation:** turning **Extract date(s) from file path** on later does not backfill already
  scanned files during a normal scan, because unchanged files are skipped. Running the folder's
  path metadata action is the way to fill them.
- **Limitation:** the "path year is earlier" rule is deliberately one-directional. A folder named
  for a *later* year than the capture date is ignored, so a mis-filed photo keeps its camera date.
- **Limitation:** all dates are formatted in UTC, so a photo taken late at night in a distant time
  zone can display the adjacent day.
- **Open question:** year-based smart albums and album date filters use the capture date with a file
  date fallback, while the quick filters and search use the event date. The same photo can therefore
  land in a different year depending on where the user looks. Whether those surfaces should share
  one date is undecided.
- **Open question:** the app records dates the AI reads inside images separately and never lets them
  affect the capture or event date. Whether they should ever be offered as a suggestion is undecided.

## 14. References

- Module: [Catalog & Metadata](README.md)
- [Path-based metadata extraction](05-path-based-metadata-extraction.md) — where path dates come from
- [Folder scan & catalog](01-folder-scan-and-catalog/README.md) — when dates are read
- [J-X1 — recommended setup path](../JOURNEYS.md#j-x1--recommended-setup-path-first-library)
