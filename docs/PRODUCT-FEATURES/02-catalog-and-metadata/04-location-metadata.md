---
id: F-02-04
module: 02-catalog-and-metadata
title: Location metadata
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/electron/geocoder/reverse-geocoder.ts
  - apps/desktop-media/electron/db/media-item-geocoding.ts
  - apps/desktop-media/electron/path-extraction/location-resolver.ts
  - apps/desktop-media/electron/pipelines/definitions/gps-geocode.ts
  - apps/desktop-media/electron/pipelines/definitions/geocoder-init.ts
related:
  - F-02-01
  - F-02-05
---

# Location metadata

> Turn the GPS coordinates hidden in your photos into country, region and city names you can
> actually search for.

## 1. Summary

Phones have been stamping GPS coordinates into photos for well over a decade, but a pair of decimal
numbers is useless to a person. This feature converts them into place names — country, state or
province, county or district, and the nearest city — and stores them on the photo so they can be
searched, filtered and grouped into place albums.

The conversion happens entirely on the user's machine. There is no lookup service and nothing leaves
the computer. The trade-off is a one-time download of roughly 2 GB of GeoNames geographic data, which
is why the feature is **off by default** and asks for confirmation before the download starts. Once
the data is cached locally, geocoding is fast and works offline forever.

Because the download is the only real cost, the recommended order matters: turning **Detect Country
/ City from GPS coordinates on folder scan** on *before* the first folder scan means locations are
filled in as part of that scan. Turning it on later means running a second pass over the library.

For photos with no GPS at all — scans, older cameras, screenshots — place names can still come from
the folder names, via [Path-based metadata extraction](05-path-based-metadata-extraction.md). GPS
always wins when both exist.

## 2. User stories

- **As someone who travels** I want to find "the photos from Portugal" without remembering which
  folder they are in, **so that** my library is searchable by place.
- **As a privacy-conscious user** I want place names resolved without sending my coordinates
  anywhere, **so that** using the feature costs me nothing but disk space.
- **As someone setting up** I want to be told the download is large before it starts, **so that** I
  am not surprised by 2 GB of traffic.
- **As someone who already scanned a big library** I want to add locations afterwards without
  re-reading every file, **so that** enabling the feature late is not a punishment.
- **As someone browsing** I want albums grouped by country and city, **so that** trips surface on
  their own.

## 3. Scope

**In scope**

- Reading GPS coordinates out of image and video files during the folder scan
- Downloading and building the local geographic database, with progress and cancellation
- Converting coordinates to country, state or province, county or district, and nearest city
- Deciding which source wins when a photo has both GPS and a path-derived location
- The **Geo-location** card and tab in the folder dashboard, and the action that runs geocoding for
  a folder
- Filtering by location text, and place-based albums

**Out of scope**

- Deriving places from folder names — see
  [Path-based metadata extraction](05-path-based-metadata-extraction.md)
- Editing a photo's location by hand
- Writing a resolved place name back into the file
- A map view; the app has no map
- Removing GPS coordinates from files before sharing

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Country and city albums | [Albums](../06-albums/README.md) |
| Location text in search filters | [Search & Discovery](../05-search-and-discovery/README.md) |
| The folder dashboard the Geo-location card sits in | [Insights & Library Health](../08-insights-and-library-health/README.md) |
| Where the geographic database is stored on disk | [Settings & Configuration](../11-settings-and-configuration/README.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-02-04.1 | GPS coordinate reading | Latitude and longitude captured for every photo and video that has them | shipped |
| F-02-04.2 | Geographic database setup | A confirmed, resumable ~2 GB download with progress in the dock, cached for future runs | shipped |
| F-02-04.3 | Reverse geocoding during scan | Place names filled in as part of the folder scan, as a visible fourth phase | shipped |
| F-02-04.4 | Standalone geocoding pass | A folder-level action that geocodes an already-scanned library without re-reading files | shipped |
| F-02-04.5 | Source priority | GPS places outrank path-derived places, which outrank AI-guessed places | shipped |
| F-02-04.6 | Geo-location coverage view | **Files with GPS** and **Location extracted** counts per folder | shipped |
| F-02-04.7 | Location filtering | **Location contains** quick filter, applied to grid and search results | shipped |

## 5. User journeys

### J-02-04-1 — Enable locations before the first scan (recommended)

**Trigger:** the user is setting up a new library and reaches Settings.
**Preconditions:** none.

1. In Settings → **Folder scanning, file metadata and Geo-location**, the user ticks **Detect
   Country / City from GPS coordinates on folder scan**.
2. A confirmation appears: **Download location data?** — "This will download approximately 2 GB of
   geographic data from GeoNames. The download happens in the background and data is cached locally
   for future use." The user chooses **Download**.
3. A **GPS location database** card appears in Background operations, moving through
   **Downloading GeoNames data (~2 GB)…**, **Building location index…** and **Location database
   ready.**
4. The user runs the folder scan. The dock now shows four phases instead of three, with **Updating
   location data from GPS** after the file reading phase.
5. When the scan finishes, photos carry country, region and city, and the **Location contains**
   quick filter works.

**Outcome:** places are available from the first scan, with no second pass over the library. This is
why the [recommended setup path](../JOURNEYS.md#j-x1--recommended-setup-path-first-library) puts the
setting before the scan.

**Alternate paths**

- The geographic data is already on disk from an earlier install → the confirmation notes the local
  copy and initialisation only loads the cache, taking seconds.
- The user cancels the confirmation → the setting stays off and nothing is downloaded.

**Failure paths**

- The download fails → the card shows **Location database initialization failed.** The scan still
  completes; photos keep their coordinates but no place names, and the geocoding can be retried.

### J-02-04-2 — Add locations to a library that was already scanned

**Trigger:** the user turns the setting on after scanning, or wants to fill gaps.
**Preconditions:** the folders have been scanned, so coordinates are already in the catalog.

1. The user opens **Folder AI analysis summary** for a folder or root and looks at the
   **Geo-location** card. It shows **Files with GPS** as a share of the folder's media, and
   **Location extracted** as a share of those.
2. The user presses the card's play button.
3. The geographic database is prepared if needed, then only the photos that have coordinates and are
   missing place names are geocoded. No image files are re-read.
4. The card's counts rise to complete.

**Outcome:** an existing library gains locations without a full re-scan.

**Alternate paths**

- The folder has no photos with coordinates → the run completes immediately with nothing to do, and
  the card stays neutral rather than showing a problem.
- Only part of the tree was scanned → the pass still runs over whatever is in the catalog.

**Failure paths**

- The geographic database cannot be prepared → the geocoding step is skipped rather than half-run,
  and the counts stay where they were.

### J-02-04-3 — Find photos from a place

**Trigger:** the user wants everything from a city or country.

1. The user opens the quick filters, ticks **Location contains** and types a place name.
2. The grid narrows to photos whose country, region, county or city text contains it.
3. The same filter carries into search results.

**Outcome:** place is a first-class way to narrow the library.

**Alternate paths**

- The user browses place albums instead, which group by country and then by year or region.
- Some photos have places from folder names rather than GPS → they still match the filter; place
  albums keep GPS-derived and non-GPS places in separate groupings.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| GPS setting and confirmation | Settings → **Folder scanning, file metadata and Geo-location** | **Detect Country / City from GPS coordinates on folder scan**, then the **Download location data?** dialog with **Download** / **Cancel** | `apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx` |
| GPS location database card | Background operations, while the database is being prepared | Status text and a progress bar counting downloaded datasets | `apps/desktop-media/src/renderer/components/progress-dock/cards/GeocoderInitCard.tsx` |
| Scan geocoding phase | Background operations, during a scan | **Media metadata scan - updating locations**, and **Updating location data from GPS** as the phase name | `apps/desktop-media/src/renderer/components/progress-dock/cards/MetadataScanCard.tsx` |
| Geo-location card | Folder row menu → **Folder AI analysis summary** | **Files with GPS**, **Location extracted**, progress bars, play button, info button | `apps/desktop-media/src/renderer/components/folder-ai-summary/SummaryGeoLocationCard.tsx` |
| Geo-location tab | Folder AI analysis summary → **Geo-location** | Per-folder **Images with GPS**, **Videos with GPS**, **Files with GPS**, **GPS Location extracted** | `apps/desktop-media/src/renderer/components/folder-ai-summary/DesktopFolderAiSummaryDashboard.tsx` |
| Location quick filter | Filter button above the grid | **Location contains** with a text box | `apps/desktop-media/src/renderer/components/QuickFiltersMenu.tsx` |

**States**

| State | What the user sees |
|---|---|
| Setting off | No geocoding phase in scans; the scan dock shows three phases |
| Database missing | The confirmation dialog, then a download card |
| Database cached | Initialisation reports **Loading cached GeoNames data…** and finishes quickly |
| Folder with no GPS files | The Geo-location card stays neutral, showing **Files with GPS** as zero |
| Partly geocoded | Amber card with the number already done |
| Fully geocoded | Green card with **Location extracted** at 100% |
| Database failed | **Location database initialization failed.**; the geocoding step is skipped |

**UX notes**

- The number of phases shown in the scan dock follows the *setting*, not whether the current folder
  happens to contain photos with coordinates, so the progress display stays predictable.
- The download progress bar counts completed datasets rather than bytes, and stops at 95% until the
  index is built, so it never sits at 100% while work continues.
- Once downloaded, the data files are pinned so later runs do not re-fetch the same large files
  when the upstream data is refreshed.
- The card's play button is disabled while a folder scan is running, to avoid two passes writing
  locations at once.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Coordinates are read from files during every folder scan, regardless of the GPS setting. | Only the *conversion* to place names needs the big download; keeping the coordinates costs nothing and means enabling the feature later requires no re-read. | `apps/desktop-media/electron/db/media-item-metadata.ts` |
| BR-2 | Reverse geocoding requires an explicit confirmation before the first download, and the setting stays off if the user declines. | 2 GB is a material cost on a metered or slow connection; it must never be spent silently. | `apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx` |
| BR-3 | The geographic database loads the cities dataset plus first- and second-level administrative codes, and no alternate names or deeper administrative levels. | Enough for country, region, county and city while keeping the download and memory footprint as small as possible. | `apps/desktop-media/electron/geocoder/reverse-geocoder.ts` |
| BR-4 | A coordinate resolves to the single nearest city in the dataset, and that city's country and administrative names are used. | One unambiguous answer per photo; nearest-city is the standard approximation. | `apps/desktop-media/electron/geocoder/reverse-geocoder.ts` |
| BR-5 | Only photos and videos that have coordinates and whose GPS-derived country, region or city is missing are geocoded. | Makes repeat runs nearly free and makes the second-pass action safe to press at any time. | `apps/desktop-media/electron/db/media-item-geocoding.ts` |
| BR-6 | A missing county or district does not mark a photo as needing geocoding again. | Many places genuinely have no second-level administrative name; treating that as incomplete would re-geocode them forever. | `apps/desktop-media/electron/db/media-item-geocoding.ts` |
| BR-7 | A GPS-derived location overwrites a location from any other source, and is itself only overwritten by a different GPS result. | Coordinates from the camera are the most reliable evidence available. | `apps/desktop-media/electron/db/media-item-geocoding.ts` |
| BR-8 | When several sources propose a location, priority runs GPS, then the file's embedded location, then an AI-read path location, then a rule-based path location, then a location guessed from the image itself. The first source with any non-empty field wins outright. | A single, documented order prevents fields from different sources being mixed into a place that does not exist. | `apps/desktop-media/electron/path-extraction/location-resolver.ts` |
| BR-9 | If the geographic database is not ready, the geocoding step is skipped rather than partially run. | A half-geocoded library is harder to reason about than one that plainly has not been geocoded. | `apps/desktop-media/electron/pipelines/presets.ts` |
| BR-10 | Geocoding is performed in batches, and a cancellation takes effect between batches; work already written is kept. | Cancelling must be immediate and must not roll back correct results. | `apps/desktop-media/electron/pipelines/definitions/gps-geocode.ts` |
| BR-11 | The scan progress dock shows four phases when the GPS setting is on and three when it is off, independent of whether the scanned folder contains any coordinates. | Progress presentation must not change shape mid-library. | `apps/desktop-media/electron/ipc/metadata-scan-handlers.ts` |
| BR-12 | Place albums group photos whose location came from GPS separately from those whose location came from anywhere else. | Keeps a browsing surface built on reliable data distinct from one built on inference. | `apps/desktop-media/electron/db/media-albums.ts` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| Detect Country / City from GPS coordinates on folder scan | **Off** | Enables reverse geocoding during folder scans and adds the location phase. Turning it on prompts for the ~2 GB download. | No |

Defined in `apps/desktop-media/src/shared/ipc.ts` (`DEFAULT_FOLDER_SCANNING_SETTINGS`,
`detectLocationFromGps`). The storage location for the data is shown in Settings as
**Geo-location database folder (GPS coordinates decoding to country, area, city)**.

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Coordinates | `media_items.latitude`, `media_items.longitude` | Whether this photo counts towards **Files with GPS** |
| Resolved place | `media_items.country`, `media_items.location_area` (state or province), `media_items.location_area2` (county or district), `media_items.city` | The place names shown, filtered and grouped |
| Named place | `media_items.location_place` | A specific place name, when a non-GPS source supplied one |
| Which source won | `media_items.location_source` | Whether the place came from GPS or from inference |
| All candidate locations | `ai_metadata.locations_by_source` | Every source's proposal, retained so a better source can take over later |
| Geographic datasets | The geo-location database folder shown in Settings | The one-time download, reused by every later run |

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| [Folder scan & catalog](01-folder-scan-and-catalog/README.md) | Coordinates in the catalog | Nothing to geocode |
| Internet access, once | Downloading the geographic datasets | **Location database initialization failed.**; coordinates are kept, place names are not produced |
| Roughly 2 GB of free disk space | Caching the datasets | The download fails and geocoding is skipped |
| GPS in the files | Any GPS-derived place | The Geo-location card reports zero files with GPS; places can still come from folder names |
| [Background processing](../09-background-processing/README.md) | Progress, queueing and cancellation | No visible progress for the download or the geocoding pass |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `media:init-geocoder` | `forceRefresh` | Download and build the geographic database, or reload the cache |
| `media:geocoder-init-progress` | — | Status and progress events for that preparation |
| `media:get-geocoder-cache-status` | — | Report whether the data is already on disk, used by the confirmation dialog |
| `media:get-gps-geocode-pending-count` | `folderPath`, `recursive` | How many items still need place names |
| Pipeline `geocoder-init` | `forceRefresh` | The preparation step as a queued job |
| Pipeline `gps-geocode` | `folderPath`, `recursive` | Geocode a folder or the whole library |
| Preset `geo-only` | `folderPath`, `recursive` | Prepare the database and then geocode, as one bundle |
| Preset `path-and-geo` | `folderPath`, `recursive` | Re-run path rules and then geocode |

Defined in `apps/desktop-media/src/shared/ipc.ts`,
`apps/desktop-media/electron/pipelines/presets.ts`.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| Unit | `apps/desktop-media/electron/db/media-item-geocoding.test.ts` | Candidate selection, that a missing county is not treated as incomplete, chunking of large id lists, and the change count from an update |
| Unit | `apps/desktop-media/electron/geocoder/reverse-geocoder.test.ts` | Geocoder initialisation, cache detection and batch lookup behaviour |
| Unit | `apps/desktop-media/electron/geocoder/country-codes.test.ts` | Country code to country name mapping |
| E2E | `apps/desktop-media/tests/e2e/geocoder-download.spec.ts` | Confirming the download enables the setting and completes in Background operations; a cached copy is reused by default |
| E2E | `apps/desktop-media/tests/e2e/geolocation-metadata-scan.spec.ts` | Only photos with coordinates are geocoded, and a repeat scan reports zero location updates |
| E2E | `apps/desktop-media/tests/e2e/geo-location-folder-ai-summary.spec.ts` | The Geo-location card's play action completes after a full scan, with no GPS files, and on a partly scanned tree |

## 13. Known limitations & open questions

- **Limitation:** the roughly 2 GB download is the single biggest setup cost in the product, and
  there is no smaller option such as a country subset or an online lookup.
- **Limitation:** places are the nearest city in the dataset, so a photo taken in open countryside,
  at sea or in the air is attributed to a city that may be far away, with no indication of distance
  in the interface.
- **Limitation:** locations cannot be edited or corrected by hand.
- **Limitation:** enabling the setting after scanning does not backfill automatically. The user has
  to find the Geo-location card and press play, per folder or per root.
- **Limitation:** the download progress bar counts datasets, not bytes, so it advances in three
  large steps rather than smoothly.
- **Limitation:** county or district names are only available where the dataset has them, which
  varies a lot by country.
- **Limitation:** resolved place names are never written back into the files, so other applications
  do not see them.
- **Open question:** the source priority reserves a slot for a location embedded in the file's own
  metadata, ranked just below GPS, but nothing currently writes that slot, so it never participates.
- **Open question:** there is no way to remove or refresh a photo's location once set, other than
  changing the coordinates in the file and re-scanning.

## 14. References

- Module: [Catalog & Metadata](README.md)
- [Folder scan & catalog](01-folder-scan-and-catalog/README.md) — where coordinates are read
- [Path-based metadata extraction](05-path-based-metadata-extraction.md) — places for photos with no
  GPS
- [J-X1 — recommended setup path](../JOURNEYS.md#j-x1--recommended-setup-path-first-library)
- Implementation history: `docs/IMPLEMENTATION-LOG/features/2026-04_gps_reverse_geocoding_integration_a46dd07b.plan.md`
