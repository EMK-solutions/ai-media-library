---
id: M-06
title: Albums
status: shipped
last_reviewed: 2026-08-26
---

# Module 06 — Albums

> Collect photos into albums you name yourself, and browse collections the product builds
> automatically from place, year, people and rating.

## 1. Purpose & value

Folders on disk stay the source of organisation. Albums sit on top: a photo can belong to several
albums without being copied or moved. A **manual album** is a titled, ordered set the user builds
item by item. A **smart album** is not stored as a list — it is a live query over the catalog, so
it grows as new photos are scanned, analysed and tagged.

This is the module a family organiser reaches for when they want a slideshow of a trip, the best
photos of a year, or “everyone in this household together”. Adding a photo to an album happens from
wherever that photo already is — the folder grid, search results, or the album itself — via the
item menu owned by [Media item actions](../01-library-browsing-and-media-viewer/07-media-item-actions.md).

## 2. User stories

- **As a curator** I want to put chosen photos into a named album and keep them in a chosen order,
  **so that** a trip or a person has a gallery I control.
- **As someone with a large library** I want the product to group photos by country, year and place
  **so that** I can browse geography without building those albums by hand.
- **As a family organiser** I want a “best of” view for a year, a person or a people group,
  **so that** I can show the keepers without wading through every file.
- **As someone revisiting work** I want recently used albums in the sidebar,
  **so that** I can open them without hunting the full list.

This module is not a replacement for folders, and it is not a place to delete files.

## 3. Feature index

| ID | Feature | Status | Primary screen | Doc |
|---|---|---|---|---|
| F-06-01 | Manual albums | shipped | Albums list and album detail | [01-manual-albums.md](01-manual-albums.md) |
| F-06-02 | Smart albums | shipped | Smart album tree, year cards and item grid | [02-smart-albums.md](02-smart-albums.md) |
| F-06-03 | Album filters & defaults | shipped | Album search strip, smart filter panel, Settings → Albums | [03-album-filters-and-defaults.md](03-album-filters-and-defaults.md) |

## 4. Key journeys

| ID | Journey | Path through the product |
|---|---|---|
| J-06-1 | Create a first album | Sidebar **Albums** → name it → add photos from a folder via the item ⋮ **Albums** panel |
| J-06-2 | Reopen recent work | Sidebar **RECENT** → open the album → continue from the last order |
| J-06-3 | Browse a place | Sidebar **SMART ALBUMS** → **Country > Year > Area** or **Country > Area > City** → expand a country → open a leaf |
| J-06-4 | Show the keepers of a year | **Best of Year** → pick a year card → optional **Randomize** |
| J-06-5 | Best of a household | **Best of People group** → pick up to three groups in the filter panel |

Cross-module flows, including the recommended setup path, are in [`../JOURNEYS.md`](../JOURNEYS.md)
([J-X3](../JOURNEYS.md) curates an album; [J-X1](../JOURNEYS.md) step 7 organises after pipelines).

## 5. Entry points & navigation

| Entry point | Leads to | Notes |
|---|---|---|
| Sidebar **Albums** | Albums workspace (list, create, detail or smart) | The window shows one workspace at a time |
| Sidebar **Search albums** | Matching manual albums by title | Case-insensitive; results sit above the sections |
| Sidebar **RECENT** | Album detail | Up to 10 recently used manual albums; collapsed by default |
| Sidebar **ALL ALBUMS** | Full album list, with search filters open | Does not list albums inside the sidebar |
| Sidebar **SMART ALBUMS** | A smart album root | Nested **Best of** and **Countries** groups |
| Sidebar Albums **+** / workspace **Create album** | Inline create | Empty library shows the title field in the list header |
| Item ⋮ → **Albums** | Membership checkboxes | Owned by [F-01-07](../01-library-browsing-and-media-viewer/07-media-item-actions.md) |
| Settings → **Albums** | Default ratings and category exclusions | Owned with [F-06-03](03-album-filters-and-defaults.md) |

## 6. Key concepts

| Term | Meaning in this module |
|---|---|
| Manual album | A user-created, titled, ordered set of catalog items. Membership does not move files. |
| Smart album | A live query over the catalog (place, year, people, rating). No stored membership list. |
| Recent | Up to 10 manual albums the user last opened, created, added to, or reordered. |
| Cover | The picture on the album card. Chosen by the user, or the highest-rated member. |
| Smart album root | One of the sidebar entries under **SMART ALBUMS** (for example **Best of Year**). |
| People group | A named set of people, used by **Best of People group**. Owned by [M-04](../04-people-and-faces/README.md). |

Full definitions: [`../GLOSSARY.md`](../GLOSSARY.md).

## 7. Dependencies

**Depends on**

| Module | What it needs |
|---|---|
| [M-01 Library Browsing & Media Viewer](../01-library-browsing-and-media-viewer/README.md) | Same grid, list, viewer and item menu for album contents |
| [M-02 Catalog & Metadata](../02-catalog-and-metadata/README.md) | Dates, places and identity; GPS place names for country smart albums |
| [M-03 AI Image Analysis](../03-ai-image-analysis/README.md) | Categories (exclusions), quality ratings, titles used in smart filters |
| [M-04 People & Faces](../04-people-and-faces/README.md) | Person tags, unconfirmed similar faces, people groups |
| [M-11 Settings & Configuration](../11-settings-and-configuration/README.md) | Settings → **Albums** defaults |

**Depended on by**

| Module | What it consumes |
|---|---|
| [M-10 Sharing & Presentation](../10-sharing-and-presentation/README.md) | Intended as a source for TV slideshows; see known gaps |

## 8. Settings owned

| Settings group (UI label) | Features affected |
|---|---|
| **Albums** — Default Rating, Default AI rating, Exclude image categories in smart albums | F-06-02, F-06-03 |

## 9. Quality snapshot

| Type | Coverage |
|---|---|
| E2E | `apps/desktop-media/tests/e2e/albums.spec.ts` — create from the empty-library header, open detail, return to the list |
| E2E | `apps/desktop-media/tests/e2e/albums-reorder.spec.ts` — drag-reorder in the album grid updates persisted order |
| Integration | `apps/desktop-media/electron/db/media-albums.integration.test.ts` — membership, cover fallback, list filters, place/year/people smart queries, category exclusions, randomize |
| Unit | `apps/desktop-media/src/renderer/actions/album-actions.test.ts`, `.../DesktopAlbumsWorkspace.test.tsx`, `packages/media-store/src/slices/albums.test.ts`, `packages/shared-contracts/src/utils/album-date-filters.test.ts` |

**Gaps:** no E2E for smart album roots, people-group intersection, or Settings defaults applying to a new smart session. Rename and delete are tested at the action/IPC layer, not in the albums workspace UI (that UI is not mounted today).

## 10. Known gaps & direction

- Rename and delete exist as actions and IPC, but the albums workspace has no controls for them
  (`DesktopAlbumDetailPanel` is unused). Users cannot rename or delete an album from the current
  screens.
- The type `ai-countries` (non-GPS place source) is implemented in queries but has no sidebar row.
- The smart filter panel labels the text field **AI search prompt**; matching is a substring on
  filename, display title and AI-written title/description, not [AI image search](../05-search-and-discovery/README.md).
- Combining star rating with AI rating as **AND** is implemented in queries; the filter panel shows
  a fixed **OR**.
- Settings copy says **Broadcast album to TV**, but the toolbar broadcast control starts from a
  selected folder, not from an album.
