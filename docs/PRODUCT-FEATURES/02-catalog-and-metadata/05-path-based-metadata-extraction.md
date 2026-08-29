---
id: F-02-05
module: 02-catalog-and-metadata
title: Path-based metadata extraction
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/electron/path-extraction/date-extractor.ts
  - apps/desktop-media/electron/path-extraction/title-extractor.ts
  - apps/desktop-media/electron/path-extraction/llm-path-analyzer.ts
  - apps/desktop-media/electron/ipc/path-analysis-handlers.ts
  - apps/desktop-media/electron/db/media-item-path-extraction.ts
related:
  - F-02-03
  - F-02-04
---

# Path-based metadata extraction

> `1998 Summer Croatia/scan0042.jpg` already tells you when and where. The app reads it, so photos
> with no usable embedded metadata are still dated and placed.

## 1. Summary

Long before anyone had a photo app, people organised photos by naming folders: `2014-08 Italy`,
`Wedding 1998`, `Mum's albums 1970-1979`. That naming is real metadata, and for scanned prints and
old digital cameras it is often the *only* metadata. This feature reads it.

It works in two layers. A **rule-based pass** runs automatically during every folder scan and looks
for date patterns in filenames and folder names — full dates, month and year, bare years, ranges and
compact camera-style stamps — plus a readable title from the filename with camera prefixes stripped
away. It is fast, deterministic, needs no AI, and is on by default.

An **AI pass** is available for paths the rules cannot handle: `Krakow trip with Anna, spring 06`
means something to a language model and nothing to a regular expression. It runs a local model
through Ollama, first over the folder names to establish context and then over individual files, and
it can produce places and titles as well as dates. It is off by default because it needs Ollama and
a suitable model installed, and it is invoked deliberately from a folder's menu rather than
automatically.

Anything derived this way is treated as inference, not fact. Dates from paths only override a
photo's own capture date in the specific case that they point at an earlier year, and the viewer
labels them with an amber notice. Places from paths always yield to GPS.

## 2. User stories

- **As someone with a scanned family archive** I want the years in my folder names to become real
  dates, **so that** decades of photos become browsable without manual tagging.
- **As someone whose folders are named in prose** I want the app to make sense of them anyway,
  **so that** I do not have to rename thousands of folders.
- **As someone with camera-named files** I want a readable title instead of `DSC_0491`, **so that**
  lists and search results are legible.
- **As a cautious user** I want inferred metadata clearly marked as inferred, **so that** I can tell
  what the app knows from what it guessed.

## 3. Scope

**In scope**

- Recognising dates and date ranges in filenames and folder names during the folder scan
- Deriving a readable display title from a filename
- The optional AI pass over folder and file paths, producing dates, places and titles
- Choosing the model to use, with a fallback
- Skipping files whose names are nothing but a camera identifier
- Re-running the rule-based pass over an existing library

**Out of scope**

- Deciding which date a photo ends up with — see [Date metadata](03-date-metadata.md)
- Converting GPS coordinates to places — see [Location metadata](04-location-metadata.md)
- Reading anything from the image pixels; this feature only ever looks at text in the path
- Renaming files or folders; the app never touches names on disk
- Installing or managing Ollama

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Event date precedence and display | [Date metadata](03-date-metadata.md) |
| Location source priority | [Location metadata](04-location-metadata.md) |
| Ollama availability and model management | [AI Image Analysis](../03-ai-image-analysis/README.md) |
| Job queueing, progress and cancellation | [Background Processing](../09-background-processing/README.md) |
| Titles produced by analysing the picture itself | [AI Image Analysis](../03-ai-image-analysis/README.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-02-05.1 | Rule-based date extraction | Dates and date ranges from filenames and folder names, during every scan | shipped |
| F-02-05.2 | Display title extraction | A readable title instead of a camera filename | shipped |
| F-02-05.3 | AI path analysis | Dates, countries, regions, cities and titles inferred from messy paths | shipped |
| F-02-05.4 | Folder-context pass | Folder names analysed first, so files inherit their folder's date and place | shipped |
| F-02-05.5 | Camera-name skipping | Files named only `IMG_1234` or `scan0002` are excluded from the AI file pass | shipped |
| F-02-05.6 | Model selection with fallback | A primary and a fallback Ollama model id, resolved against what is installed | shipped |
| F-02-05.7 | Standalone rule re-run | Re-apply the rules across a folder or the whole library without re-reading files | shipped |

## 5. User journeys

### J-02-05-1 — Date a scanned archive from its folder names

**Trigger:** the user scans `D:\Photos\1998 Summer Croatia` full of `scan0001.jpg`.
**Preconditions:** **Extract date(s) from file path** is on (the default).

1. The folder scan reads each file. The scanner left no capture date, or a date from the day of
   scanning.
2. The rules find `1998` in the folder name and record it as a year-precision date.
3. Because 1998 is earlier than anything in the files, it becomes the photo's event date.
4. Opening a photo shows **1998** with the amber **Date extracted from file path** notice.
5. The **Event years (database)** quick filter now finds these photos under 1998.

**Outcome:** an archive with no embedded dates becomes browsable by year, with no extra steps.

**Alternate paths**

- The folder is named `1998-07-12 -- 1998-07-19` → a start and end date are recorded, and the photo
  matches any year-range filter touching that span.
- The folder is named `Mum's albums 1970-1979` → a year range from 1970 to 1979 is recorded.
- The filename carries its own date, such as `20040815_party.jpg` → the filename's date is used in
  preference to the folder's.
- No date appears anywhere in the path → nothing is recorded, and the photo keeps whatever its file
  says.

### J-02-05-2 — Make sense of prose folder names with AI

**Trigger:** the user has folders like `Krakow trip with Anna, spring 06` that the rules cannot read.
**Preconditions:** Ollama is running with a compatible text model; **Detect location and dates from
file paths using AI (LLM)** is on. That setting is in the advanced group.

1. Turning the setting on adds **Extract path metadata (LLM)** to the folder right-click menu.
2. The user opens it, chooses whether to include subfolders, and presses play.
3. A **Path metadata (LLM)** card appears in Background operations with a running count.
4. The app first sends the folder names to the model to establish per-folder context, then the
   individual file paths, in batches of 15.
5. Results are written per photo: a date, a country, region and city, and a display title. Files
   whose names are only a camera identifier are skipped in the file pass but still inherit their
   folder's context.
6. The **Location from file path by LLM** column in the folder dashboard's Geo-location tab rises.

**Outcome:** paths that no rule could parse produce usable dates, places and titles.

**Alternate paths**

- Neither the primary nor the fallback model is installed → the run fails immediately with a message
  naming the setting and telling the user to pull a model or enter ids matching their Ollama
  installation.
- The user cancels mid-run → work already written is kept; the rest is not attempted.
- The model returns a place whose city does not match its country, or names two countries → it is
  instructed to return nothing rather than guess, so the photo keeps no place.

**Failure paths**

- Ollama is not running → the run cannot start, and nothing is written.
- The model's answer cannot be parsed for a batch → that batch's files are counted as failed and the
  run continues.

### J-02-05-3 — Get readable titles instead of camera filenames

**Trigger:** any folder scan.

1. The rules strip the extension, leading camera and scanner identifiers such as `IMG_`, `DSC_`,
   `PANO`, `scan`, and trailing lone digits.
2. What remains, if it is meaningful, becomes the photo's display title.
3. A filename that is *only* an identifier — `IMG_1234`, `scan0002` — produces no title, so the app
   falls back to the filename rather than showing an empty label.

**Outcome:** `1998 Botanical garden 3.jpg` lists as *1998 Botanical garden*; `IMG_1234.jpg` lists as
itself.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Path extraction settings | Settings → **Folder scanning, file metadata and Geo-location** | **Extract date(s) from file path**; and, under advanced, **Detect location and dates from file paths using AI (LLM)** with **Primary (Ollama model id)** and **Fallback (Ollama model id)** | `apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx` |
| Extract path metadata (LLM) | Folder right-click → **Extract path metadata (LLM)** — only present when the AI setting is on | Expandable row with **Include sub-folders** and a play / cancel button | `apps/desktop-media/src/renderer/components/FolderAnalysisMenuSection.tsx` |
| Path metadata (LLM) card | Background operations, while the AI pass runs | Processed and total counts, cancel control | `apps/desktop-media/src/renderer/components/progress-dock/cards/PathAnalysisCard.tsx` |
| Location from file path by LLM | Folder AI analysis summary → **Geo-location** tab | Per-folder count of photos given a place by the AI pass | `apps/desktop-media/src/renderer/components/folder-ai-summary/DesktopFolderAiSummaryDashboard.tsx` |
| Path date notice | Viewer, when a path date won | Amber **Date extracted from file path** under the headline date | `apps/desktop-media/src/renderer/components/DesktopViewerInfoPanel.tsx` |

**States**

| State | What the user sees |
|---|---|
| Rules on, nothing found | No change; dates and titles come from the files |
| Rules on, date found | An event date, and the amber notice when it beat the file's own date |
| AI setting off | No **Extract path metadata (LLM)** menu entry at all |
| AI pass running | A progress card with a count, and a disabled play button in the menu |
| AI pass, no model | An error naming the setting and the two model ids |
| AI pass cancelled | Partial results kept; the card closes |

**UX notes**

- The rule-based pass is invisible by design: it runs inside the scan and has no separate progress.
- The AI entry is hidden entirely rather than disabled when the feature is off, so users who will
  never run a local model do not see it.
- The **Include sub-folders** choice sits next to the action rather than in settings, because it is a
  per-run decision.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | The rules look for, in order: a full date range, a range within one month, a day span, a four-digit year range, a shortened year range, a single ISO date, an eight-digit compact date, a year and month, and finally a bare year. The first match wins. | More specific patterns must be tried before less specific ones, or `1998-07-12 -- 1998-07-19` would be read as just `1998`. | `apps/desktop-media/electron/path-extraction/date-extractor.ts` |
| BR-2 | Only years between 1800 and 2100 are accepted, months 1 to 12, days 1 to 31. | Rejects serial numbers, resolutions and other four-digit noise. | `apps/desktop-media/electron/path-extraction/date-extractor.ts` |
| BR-3 | A date in the filename wins over a date in any folder name. When both exist, the source is recorded as coming from filename and folder together. | The filename is the most specific statement about that one file. | `apps/desktop-media/electron/path-extraction/date-extractor.ts` |
| BR-4 | With no date in the filename, folder names are searched from the closest folder outwards, and how many levels up the match was found is recorded. | A date on the immediate folder is more likely to be about these photos than one on a distant ancestor. | `apps/desktop-media/electron/path-extraction/date-extractor.ts` |
| BR-5 | A compact eight-digit date is only accepted at the start of a segment or after a separator, so a camera prefix such as `IMG_20040815` still matches but a longer digit run does not. | Balances catching real camera stamps against misreading long numeric names. | `apps/desktop-media/electron/path-extraction/date-extractor.ts` |
| BR-6 | The display title is the filename with the extension, leading camera and scanner identifiers, trailing identifiers, trailing lone digits and edge punctuation removed. If what remains is empty, purely numeric or the word "scan", no title is produced. | A title must be an improvement on the filename or not exist at all. | `apps/desktop-media/electron/path-extraction/title-extractor.ts` |
| BR-7 | A title is only stored when it actually differs from the filename without its extension. | Avoids filling the catalog with titles that add nothing. | `apps/desktop-media/electron/db/media-item-path-extraction.ts` |
| BR-8 | The rule-based pass runs during the folder scan for every file that was created or updated, and never for files reported unchanged. | Keeps repeat scans cheap; unchanged files already have their results. | `apps/desktop-media/electron/ipc/metadata-scan-handlers.ts` |
| BR-9 | The rule-based pass never invalidates AI results. | It only interprets the file's name, so nothing about the picture has changed. | `apps/desktop-media/electron/db/media-item-path-extraction.ts` |
| BR-10 | Run standalone, the rule-based pass covers only items that have never had path extraction applied. | Makes the re-run action safe and quick to repeat, and stops it overwriting results from the AI pass. | `apps/desktop-media/electron/pipelines/definitions/path-rule-extraction.ts` |
| BR-11 | The AI pass analyses the distinct parent folders first and keeps the result as context, then analyses individual file paths, and a file with no result of its own inherits its folder's date and place. | Folder names carry the event; asking once per folder is both cheaper and more consistent than asking once per file. | `apps/desktop-media/electron/ipc/path-analysis-handlers.ts` |
| BR-12 | Files whose name is nothing but a camera or scanner identifier are excluded from the AI file pass, but still receive their folder's context. | Sending `IMG_1234` to a language model wastes time and can only invent an answer. | `apps/desktop-media/electron/ipc/path-analysis-handlers.ts` |
| BR-13 | Paths go to the model in batches of 15, with a low temperature and a schema requiring exactly one result per path in the same order. | Keeps answers stable and aligned to inputs; a batch whose answer does not line up is truncated to the overlap rather than misattributed. | `apps/desktop-media/electron/path-extraction/llm-path-analyzer.ts` |
| BR-14 | The model is instructed to return no country and no city when a path mentions several countries or cities, or when the city and country are inconsistent. | A wrong place is worse than no place, and is hard for the user to notice. | `apps/desktop-media/electron/path-extraction/llm-path-analyzer.ts` |
| BR-15 | The model is chosen by trying the user's primary id, then the fallback id, then other compatible installed tags. If none resolve, the run fails before any work with a message naming the setting. | Silent substitution of an unexpected model would produce unexplainable results. | `apps/desktop-media/electron/ipc/path-analysis-handlers.ts` |
| BR-16 | The AI pass only fills fields that are currently empty for a photo, and re-resolves the event date and location through the shared precedence rules rather than writing directly. | It must never overwrite a camera's own capture date or a GPS-derived place. | `apps/desktop-media/electron/ipc/path-analysis-handlers.ts` |
| BR-17 | Cancelling the AI pass takes effect between batches, and results already written are kept. | Long runs must be interruptible without losing completed work. | `apps/desktop-media/electron/ipc/path-analysis-handlers.ts` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| Extract date(s) from file path | **On** | Runs the rule-based date and title pass during every folder scan, and is what writes the event date. | No |
| Detect location and dates from file paths using AI (LLM) | **Off** | Adds **Extract path metadata (LLM)** to folder menus. Requires Ollama with a compatible text model. | Yes |
| Primary (Ollama model id) | **`qwen2.5vl:3b`** | The first model id tried for the AI pass. | Yes |
| Fallback (Ollama model id) | **`qwen3.5:9b`** | Tried when the primary is not installed. | Yes |

Defined in `apps/desktop-media/src/shared/ipc.ts` (`DEFAULT_PATH_EXTRACTION_SETTINGS`).

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Rule-based results | `ai_metadata.path_extraction` (date, matched text, folder depth, title) | What the app read out of the path, and where |
| Resolved event date | `media_items.event_date_start`, `event_date_end`, `event_date_precision`, `event_date_source` | The date used by year filters |
| Display title | `media_items.display_title` | The readable label in lists and search results |
| AI-derived places | `ai_metadata.locations_by_source` entry for the AI path source, plus `media_items.country`, `city`, `location_area` when it wins | The place shown and filtered |
| When each pass ran | `media_items.path_extraction_at`, `media_items.path_llm_extraction_at` | Whether this photo has been through the rules and the AI pass |

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| [Folder scan & catalog](01-folder-scan-and-catalog/README.md) | Both passes | Nothing to extract from |
| Ollama running locally, with a resolvable model | The AI pass | The run fails with a message naming the setting and the model ids |
| [Background processing](../09-background-processing/README.md) | Progress and cancellation for the AI pass | No visible progress |
| Meaningful folder and file names | Any result at all | Nothing is recorded; dates and titles come from the files |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `media:analyze-folder-path-metadata` | `folderPath`, `recursive`, `model` | Run the AI path pass over a folder |
| `media:cancel-path-analysis` | `jobId` | Stop the AI pass, keeping what is written |
| `media:path-analysis-progress` | — | Progress events for the AI pass |
| Pipeline `path-rule-extraction` | `mediaItemIds`, or none for library-wide | Re-apply the rules |
| Preset `path-rule-only` | — | The rules alone as a queued bundle |
| Preset `path-and-geo` | `folderPath`, `recursive` | The rules followed by GPS geocoding |

Defined in `apps/desktop-media/src/shared/ipc.ts`,
`apps/desktop-media/electron/pipelines/presets.ts`.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| Unit | `apps/desktop-media/electron/path-extraction/date-extractor.test.ts` | Each date pattern, the year bounds, filename-over-folder precedence and folder depth |
| Unit | `apps/desktop-media/electron/path-extraction/title-extractor.test.ts` | Identifier stripping, rejection of empty and numeric results, and camera-name-only detection |
| Unit | `apps/desktop-media/electron/path-extraction/llm-path-analyzer.test.ts` | Prompt and request construction, batching, and parsing of model responses |
| Integration | `apps/desktop-media/electron/path-extraction/path-llm-batch-contract.integration.test.ts` | That a batch response contract of one result per path in order is honoured |
| Unit | `apps/desktop-media/electron/path-extraction/event-date-resolver.test.ts` | How a path date competes with a capture date |

**Coverage gaps:** the folder-context inheritance step, the camera-name skip inside a real run, and
cancellation mid-batch have no direct automated coverage.

## 13. Known limitations & open questions

- **Limitation:** turning **Extract date(s) from file path** on after scanning does not backfill
  during a normal scan, because unchanged files are skipped. The standalone rule pass, or the AI
  pass, is needed to fill them.
- **Limitation:** the standalone rule pass deliberately skips anything already processed, so it
  cannot be used to re-derive dates for files whose folders were renamed.
- **Limitation:** results cannot be reviewed or corrected before they are written, and there is no
  per-photo way to reject an inferred date, place or title.
- **Limitation:** the AI pass is not offered as part of the recommended setup path and has no
  onboarding, so most users will never discover it.
- **Limitation:** the rules only recognise numeric dates. Month names in any language, `Summer 98`
  and similar are left to the AI pass.
- **Limitation:** the camera and scanner identifier list is fixed. Cameras using other prefixes get
  a title that is really just a serial number.
- **Limitation:** the AI pass depends on a local model's judgement about places, and a plausible but
  wrong country or city is written with no confidence indication and no marker in the interface
  comparable to the amber date notice.
- **Open question:** the model ids shipped as defaults are a vision model and a text model
  respectively, and the primary default is the same id used elsewhere for query understanding.
  Whether these are the best choices for path text specifically is not established in code.
- **Open question:** the location record has a slot for a specific named place, but the AI path
  prompt deliberately does not ask for one, so paths never fill it. Only image analysis does.

## 14. References

- Module: [Catalog & Metadata](README.md)
- [Date metadata](03-date-metadata.md) — how a path date competes with a capture date
- [Location metadata](04-location-metadata.md) — how a path place competes with GPS
- [Folder scan & catalog](01-folder-scan-and-catalog/README.md) — when the rules run
- Implementation history: `docs/IMPLEMENTATION-LOG/features/2026-04_path_metadata_extraction.md`
