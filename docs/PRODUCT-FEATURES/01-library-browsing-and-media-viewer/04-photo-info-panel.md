---
id: F-01-04
module: 01-library-browsing-and-media-viewer
title: Photo info panel
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/DesktopViewerInfoPanel.tsx
  - apps/desktop-media/src/renderer/components/DesktopInfoSection.tsx
  - apps/desktop-media/src/renderer/components/DesktopMetadataTree.tsx
  - packages/media-viewer/src/photo-with-info-panel.tsx
  - apps/desktop-media/src/renderer/lib/photo-date-format.ts
related:
  - F-01-03
  - F-01-05
---

# Photo info panel

> Everything the app knows about the open photo — its date, camera settings, place, AI reading and
> the raw metadata behind them — beside the picture, in one panel.

## 1. Summary

While viewing a photo or video the user can open an information panel that splits the viewer:
the picture on the left, a tabbed panel on the right. The **Info** tab is the readable summary —
the capture date and the user's star rating at the top, the file name, the place, and then
collapsible sections for file facts, camera and capture settings, what AI image analysis
concluded, its quality assessment, and, for invoices and receipts, the extracted document
fields. The **Face tags** tab lists the faces found in the picture and lets the user name them,
with boxes drawn over the photo. The **Metadata** tab exposes the full stored record as an
expandable tree for anyone who wants the underlying values.

The panel is a read-out of the catalog, so what it shows depends on how much processing has been
done: the file and capture sections fill in after a folder scan, the AI sections only after AI
image analysis, and the face tab only after face detection. When a file has not been catalogued
at all the panel says so plainly rather than showing empty sections.

Beyond reading, the panel is where a photo can be rated: the star row at the top of the Info tab
is fully interactive, including the rejected marker that the grid does not show.

## 2. User stories

- **As someone reviewing a photo** I want its date, camera and place next to the picture,
  **so that** I can identify and date it without leaving the viewer.
- **As someone checking AI results** I want to see the title, description, category and quality
  the model produced, **so that** I can judge whether the analysis is trustworthy.
- **As someone rating photos** I want to set the stars while looking at the picture large,
  **so that** rating does not mean going back to the grid.
- **As a power user** I want the raw stored record, **so that** I can verify a value the summary
  does not show.
- **As someone tagging people** I want to reach face tagging from the same panel, **so that**
  naming faces is part of looking at the photo.

## 3. Scope

**In scope**

- Opening and closing the panel, and its three tabs
- The layout, sections and fields of the Info tab
- Date and place presentation, including the warning when a date came from the file path
- The rating control at the top of the Info tab
- The raw metadata tree
- The empty and not-yet-catalogued states

**Out of scope**

- Viewer navigation, fullscreen and slideshow — see
  [Media viewer & slideshow](03-media-viewer-and-slideshow.md)
- Naming faces and confirming matches, which the Face tags tab hosts but does not own — see
  [M-04 People & Faces](../04-people-and-faces/README.md)
- Producing the AI values shown — see [M-03 AI Image Analysis](../03-ai-image-analysis/README.md)
- Producing the file and capture values shown — see
  [M-02 Catalog & Metadata](../02-catalog-and-metadata/README.md)
- Invoice and receipt extraction itself — see [M-07 Documents](../07-documents/README.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Star rating behaviour, values and write-back | [Star rating](05-star-rating.md) |
| Face detection, tagging and suggestions | [M-04 People & Faces](../04-people-and-faces/README.md) |
| Where dates and places come from, and path-derived dates | [M-02 Catalog & Metadata](../02-catalog-and-metadata/README.md) |
| Rotation suggestions listed under quality | [M-08 Insights & Library Health](../08-insights-and-library-health/README.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-01-04.1 | Open and close the panel | The viewer's info button splits the screen; a close button in the tab row restores the plain viewer | shipped |
| F-01-04.2 | Info tab | Date and stars, headline, place, and collapsible sections of file, capture, AI and quality data | shipped |
| F-01-04.3 | Face tags tab | The faces found in the picture, with boxes drawn on the photo and a count badge on the tab | shipped |
| F-01-04.4 | Metadata tab | The complete stored record as an expandable tree | shipped |
| F-01-04.5 | Rate from the panel | A full, always-expanded star row including the rejected marker | shipped |
| F-01-04.6 | Video-aware sections | Videos get a "Video data" section and the file section is titled for media rather than images | shipped |
| F-01-04.7 | Invoice and receipt section | For documents with extracted fields, issuer, number, date, amount and VAT appear as their own section | shipped |
| F-01-04.8 | Path-derived date warning | A visible caution when the shown date came from the file path rather than the file's own metadata | shipped |

## 5. User journeys

### J-01-04-1 — Read everything about the open photo

**Trigger:** the user is viewing a photo and wants its details.
**Preconditions:** the folder has been scanned, so the photo is in the catalog.

1. The user clicks the info button ("Show info") in the viewer toolbar.
2. The view splits: the photo keeps the left three-fifths, the panel takes the right two-fifths.
3. The Info tab is selected. At the top sit the capture date and an editable five-star row.
4. Below it the file name, and the place as "Location: Country | Region | City" when a place is
   known.
5. Collapsible sections follow — image file data, capture data, AI image analysis, AI quality
   analysis and improvements, and, for videos or documents, video data and invoice data. Each
   header carries a count of the fields it holds, and all start collapsed. Fields with no value,
   or with placeholder text such as "unknown", are not listed at all.

**Outcome:** the user has the photo's full readable record without leaving the picture.

**Alternate paths**

- The file has never been catalogued → the panel shows the file name and "Metadata is not
  available yet for this file."
- AI image analysis has not run → the AI section is present but expands to "Run AI analysis to
  populate this section."
- The photo carries no EXIF → the capture section reads "No EXIF capture data available."
- The place was inferred rather than read from the file → the location line is suffixed with
  "(based on AI file path analysis)" or "(based on AI image analysis)".

### J-01-04-2 — Rate the photo while looking at it

**Trigger:** the user is culling and wants to mark this photo.

1. With the Info tab open, the user clicks the third star.
2. The rating is saved immediately and the same three stars appear on this photo's thumbnail in
   the grid.
3. Clicking the third star again clears the rating back to unrated.

**Outcome:** the rating is stored in the catalog; see [Star rating](05-star-rating.md) for the
full rules, including the optional write-back into the file.

### J-01-04-3 — See who is in the photo

**Trigger:** the user wants to know or record who is pictured.

1. The user clicks the **Face tags** tab, which shows a count badge when faces are known.
2. Boxes appear over the faces in the photo; the panel lists one entry per face.
3. Clicking a box selects the matching entry and vice versa, so it is always clear which face is
   being worked on.
4. Naming, confirming and correcting people happens here and is described in
   [M-04 People & Faces](../04-people-and-faces/README.md).

**Outcome:** the faces in this photo can be identified and named in place.

**Alternate paths**

- The open item is a video → "Face tags are available for images only."
- Face detection has recorded faces but the stored analysis holds no boxes → the panel falls back
  to the recorded face positions so the tab is still usable.
- The user arrives from the people screens → the viewer opens with the panel already showing and
  the Face tags tab already selected.

### J-01-04-4 — Check a value the summary does not show

**Trigger:** a user suspects the summary is hiding or reformatting something.

1. The user clicks the **Metadata** tab; the whole stored record appears as a collapsible tree of
   keys and values, and the user expands down to the value in question.

**Outcome:** the underlying data is visible without needing a database tool.

**Alternate paths**

- Nothing is stored for the item → "No metadata available".

### J-01-04-5 — Notice that a date was guessed from the folder name

**Trigger:** the user is checking dates on scanned prints or old imports.

1. The user opens the Info tab on a photo whose folder or file name contains an older date than
   the file itself.
2. The date at the top shows the path-derived date, and directly beneath it an amber warning
   reads "Date extracted from file path".

**Outcome:** the user can tell a real capture date from an inferred one before trusting it.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Info panel shell | Info button in the viewer | Photo on the left, tab row with Info, Face tags and Metadata, close button, scrollable content | `packages/media-viewer/src/photo-with-info-panel.tsx` |
| Info tab | Default tab | Date and star row, headline, location line, collapsible data sections | `apps/desktop-media/src/renderer/components/DesktopViewerInfoPanel.tsx` |
| Collapsible section | Clicking a section header | Chevron, title, count of populated fields | `apps/desktop-media/src/renderer/components/DesktopInfoSection.tsx` |
| Face tags tab | Tab row | Boxes over the photo plus a per-face list | `apps/desktop-media/src/renderer/components/DesktopFaceTagsTabContent.tsx` |
| Metadata tab | Tab row | Expandable key and value tree | `apps/desktop-media/src/renderer/components/DesktopMetadataTree.tsx` |

**Info tab sections**

| Section | Typical contents |
|---|---|
| Image file data (Media file data for videos) | Filename, path, media kind, MIME type, dimensions in pixels, file size, orientation, file date, GPS coordinates, and a copies count when the same content exists at more than one path |
| Video data (videos only) | Duration in seconds, frames per second, codec, container |
| Image capture data (Capture data for videos) | Date taken, date precision, embedded title, description and location, camera make and model, lens, focal length, aperture, exposure time, ISO |
| AI image analysis | Category, title, description, number of people detected, whether children are present |
| AI quality analysis and improvements | Aesthetic quality out of ten, the derived AI star rating out of five, whether the image is low quality, quality issues, and the number and details of edit suggestions |
| Invoice / receipt data | Issuer, invoice number, invoice date, client number, total amount and currency, VAT percentage and amount |

**States**

| State | What the user sees |
|---|---|
| Panel closed | The plain viewer with an info button |
| Open, item catalogued | Date, stars, headline and the collapsible sections |
| Open, item not catalogued | The file name and "Metadata is not available yet for this file." |
| Section with no data | The section header with a zero count and an explanatory sentence inside |
| Face tags on a video | "Face tags are available for images only." |

**UX notes**

- Every section starts collapsed, so opening the panel shows a compact overview and the user
  chooses what to expand.
- Fields whose value is empty, or literally "unknown", "n/a", "null" or "undefined", are dropped
  entirely rather than shown as blanks, and the count on each header reflects only the fields
  actually shown.
- Long values such as the file path, the AI description and the edit-suggestion details are laid
  out stacked under their label instead of inline, so they stay readable.
- Dates follow the app-wide **Date format** setting (default DD.MM.YYYY) and respect how precise
  the known date is, so a year-only date is shown as a year rather than an invented day. Clicks on
  the star row do not reach the photo underneath, so rating never navigates the viewer.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | The panel is closed whenever the viewer opens, unless the caller explicitly requests it. | Viewing a photo should default to the picture, not to data. | `packages/media-store/src/slices/viewer.ts` |
| BR-2 | Opening the viewer from the people screens opens the panel with the Face tags tab already selected. | Those entry points exist specifically to work on faces. | `apps/desktop-media/src/renderer/hooks/use-desktop-viewer-bridge.ts` |
| BR-3 | A field is shown only when it has a real value; empty strings and the placeholders "unknown", "n/a", "na", "null" and "undefined" count as no value. | Prevents a wall of blank rows on partly processed files. | `apps/desktop-media/src/renderer/components/DesktopInfoSection.tsx` |
| BR-4 | Each section header shows the number of fields it will actually display. | Lets the user decide what is worth expanding without expanding it. | `apps/desktop-media/src/renderer/components/DesktopInfoSection.tsx` |
| BR-5 | The invoice and receipt section appears only when at least one of its fields has a value. | Ordinary photos should not carry an empty invoice section. | `apps/desktop-media/src/renderer/components/DesktopViewerInfoPanel.tsx` |
| BR-6 | The date at the top uses the path-derived date, with a visible warning, only when that date is earlier than both the file's own capture date and its file date; otherwise the capture date wins. | Folder names often carry the true date of scanned material, but must not override a genuine capture date. | `apps/desktop-media/src/renderer/components/DesktopViewerInfoPanel.tsx` |
| BR-7 | The location line combines country, region, second-level area and city, and names its source when the place was inferred by AI from the file path or from the image. | The user must be able to tell a recorded GPS place from an inferred one. | `apps/desktop-media/src/renderer/components/DesktopViewerInfoPanel.tsx` |
| BR-8 | The AI star rating shown under quality is derived from the model's ten-point aesthetic score, halved and rounded up into the range one to five. It is separate from the user's own star rating. | Users compare the app's opinion with their own without the two being confused. | `apps/desktop-media/src/renderer/components/DesktopViewerInfoPanel.tsx` |
| BR-9 | The star row in the Info tab always shows all five stars and includes the rejected marker, unlike the grid and list. | The panel is the deliberate place to rate, so the full control is appropriate. | `apps/desktop-media/src/renderer/components/DesktopViewerInfoRatingRow.tsx` |
| BR-10 | For videos, the file section is titled "Media file data", a "Video data" section is added, and the Face tags tab explains that face tagging is images only. | Video items must not appear broken just because image-only data is missing. | `apps/desktop-media/src/renderer/components/DesktopViewerInfoPanel.tsx` |
| BR-11 | When the stored analysis contains no face boxes but the catalog holds detected faces for the item, the panel draws those recorded positions instead. | Face tagging stays usable on items analysed by older versions. | `apps/desktop-media/src/renderer/components/DesktopViewerInfoPanel.tsx` |
| BR-12 | Opening an image refreshes its metadata from the catalog, so results from a pipeline that finished after the folder was loaded appear without reselecting the folder, and switching away from the Face tags tab clears the selected face. | The panel should never show stale AI results, and an invisible face selection must not persist into another tab. | `apps/desktop-media/src/renderer/components/DesktopViewerInfoPanel.tsx` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| Date format | DD.MM.YYYY | Format of every date shown in the panel | No |

Defined in `apps/desktop-media/src/shared/ipc.ts` (`DEFAULT_MEDIA_VIEWER_SETTINGS`). The panel
has no settings of its own; everything else it shows is governed by the pipelines that produce
the data.

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| File, capture, place and rating values | Local catalog database | Written by the folder scan; the panel only reads them |
| AI title, description, category, quality, invoice fields | Local catalog database, under the item's AI analysis record | Appear only after AI image analysis has run on the item |
| Detected faces and their positions | Local catalog database | Drive the Face tags tab and the boxes on the photo |
| Which tab is open, which face is selected | Session state only | Reset each time the viewer is closed |

The panel writes nothing except the star rating.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Local catalog database | Every value in the panel | "Metadata is not available yet for this file." |
| [M-02 Catalog & Metadata](../02-catalog-and-metadata/README.md) | File, capture, date and place data | File and capture sections stay empty with their explanatory messages |
| [M-03 AI Image Analysis](../03-ai-image-analysis/README.md) | AI, quality and invoice sections | "Run AI analysis to populate this section." |
| [M-04 People & Faces](../04-people-and-faces/README.md) | Face tags tab and overlay boxes | The tab opens with no faces listed and no boxes drawn |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `toggleViewerInfoPanel` | — | Show or hide the panel |
| `setViewerShowInfoPanel` | `show` | Set panel visibility directly |
| `setViewerActiveInfoTab` | `info`, `tags` or `metadata` | Deep-link into a specific tab |
| `openViewer` | `index`, `source`, `{ showInfoPanel, activeInfoTab }` | Open the viewer with the panel already on a chosen tab |
| `getMediaItemsByPaths` | `paths` | Load or refresh the metadata the panel renders |
| `listFaceInstancesForMediaItem` | `mediaItemId` | Fall back to recorded face positions when the analysis record has none |

Store actions live in `packages/media-store/src/slices/viewer.ts`; channels in
`apps/desktop-media/src/shared/ipc.ts`.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/viewer-info-panel.spec.ts` | The Info tab is populated on first open without visiting Face tags, stays populated after switching to Face tags and back, and the close control restores the viewer's info button |
| Component | `packages/media-viewer/src/photo-with-info-panel.test.tsx` | The panel shell: tab selection, badge counts and the close button |
| Unit | `apps/desktop-media/src/renderer/lib/photo-date-format.test.ts` | Date labels at the requested precision and format |
| Unit | `apps/desktop-media/src/renderer/lib/media-metadata-lookup.test.ts` | Matching the open item to its catalog record |
| Unit | `apps/desktop-media/src/renderer/lib/invoice-receipt-cell-format.test.ts` | Formatting of invoice amounts and related document values |
| Unit | `packages/media-store/src/slices/viewer.test.ts` | Panel visibility and active-tab state, including opening straight onto Face tags |

**Coverage gaps:** there is no automated test for the path-derived date warning, for the
location line's source suffix, or for the field-hiding rule that drops placeholder values.

## 13. Known limitations & open questions

- **Limitation:** the panel is a fixed 60/40 split; it cannot be widened, narrowed, detached or
  shown below the photo, which makes long descriptions and paths cramped on small screens.
- **Limitation:** every section starts collapsed on every photo, so a user who always wants
  capture data has to expand it again for each item, and nothing can be copied as a block —
  there is no "copy all metadata" action.
- **Limitation:** apart from the star rating, nothing in the panel is editable — titles,
  descriptions, dates and places shown here cannot be corrected — and the Info tab does not
  indicate when its values are stale relative to a running pipeline.
- **Open question:** the panel exposes the AI star rating derived from the ten-point aesthetic
  score, while search and smart albums also use the raw ten-point value. It is not defined which
  of the two the product treats as the user-facing "AI rating".

## 14. References

- Module: [Library Browsing & Media Viewer](README.md)
- [Media viewer & slideshow](03-media-viewer-and-slideshow.md) — the viewer that hosts the panel
- [Star rating](05-star-rating.md) — the rating control at the top of the Info tab
- [M-04 People & Faces](../04-people-and-faces/README.md) — the Face tags tab's real owner
- [M-03 AI Image Analysis](../03-ai-image-analysis/README.md) — where the AI sections come from
- Recommended setup order: [`../JOURNEYS.md`](../JOURNEYS.md)
- Shared vocabulary: [`../GLOSSARY.md`](../GLOSSARY.md) — EXIF / XMP, AI rating, face instance
