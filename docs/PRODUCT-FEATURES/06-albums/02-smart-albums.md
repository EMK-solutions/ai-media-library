---
id: F-06-02
module: 06-albums
title: Smart albums
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - packages/shared-contracts/src/domain/albums.ts
  - apps/desktop-media/src/renderer/components/SmartAlbumsWorkspace.tsx
  - apps/desktop-media/src/renderer/components/DesktopSidebarAlbumsSection.tsx
  - apps/desktop-media/electron/db/media-albums.ts
related:
  - F-06-01
  - F-06-03
  - F-02-04
  - F-04-05
---

# Smart albums

> Browse live collections the catalog already knows how to build — by place, by year, or the best
> photos of people you have named.

## 1. Summary

A smart album is not a list the user maintains. Opening a sidebar root runs a query: GPS countries
broken down by year and area or by area and city; calendar years ranked by rating; photos that
include selected people or everyone in selected people groups. Results change as the catalog,
ratings and face tags change. The user can still apply
[filters and defaults](03-album-filters-and-defaults.md), randomize the “best of” grids, and open
any item in the same viewer as a folder. Nothing is stored as album membership.

## 2. User stories

- **As someone with travel photos** I want countries and cities grouped for me, **so that** I can
  walk a trip without building albums.
- **As a reviewer of a year** I want the strongest photos of that year first, **so that** I can
  pick a yearbook set quickly.
- **As a family organiser** I want the best photos of one person, several people, or a people
  group, **so that** a household slideshow does not require hand-picking.

This is not a replacement for [manual albums](01-manual-albums.md). Smart grids cannot be
reordered by dragging.

## 3. Scope

**In scope**

- Sidebar roots: **Best of Year**, **Best of Person / People**, **Best of People group**,
  **Country > Year > Area**, **Country > Area > City**
- Place trees, year cards, hierarchy and year/area sub-views
- Best-of ranking, **Randomize** and refresh (candidate cap 1000)
- Empty states that tell the user which catalog or People step is missing
- Opening items in the viewer (no stored order)

**Out of scope**

- Filter panel fields, Settings defaults, and category exclusions — see
  [Album filters & defaults](03-album-filters-and-defaults.md)
- Creating people or groups — see [People groups](../04-people-and-faces/05-people-groups.md)
- GPS place names — see [Location metadata](../02-catalog-and-metadata/04-location-metadata.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Star / AI rating, people, dates, text query, exclusions | [Album filters & defaults](03-album-filters-and-defaults.md) |
| Item ⋮ (no Set as cover / Remove from album here) | [Media item actions](../01-library-browsing-and-media-viewer/07-media-item-actions.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-06-02.1 | Country > Year > Area | GPS countries → year or month → area; sub-view bar | shipped |
| F-06-02.2 | Country > Area > City | GPS countries → area 1 / area 2 / city; toggleable levels | shipped |
| F-06-02.3 | Best of Year | Year cards with counts; paged “best of” grid | shipped |
| F-06-02.4 | Best of Person / People | Photos that include every selected person (1–20) | shipped |
| F-06-02.5 | Best of People group | Photos that match every selected group (1–3), intersection | shipped |
| F-06-02.6 | Randomize | Shuffle among the top 1000 quality candidates; stable until refresh | shipped |

## 5. User journeys

### J-06-02-1 — Walk a country by year and area

**Trigger:** sidebar **SMART ALBUMS** → **Countries** → **Country > Year > Area**.
**Preconditions:** folder scan has run with GPS location detection so countries exist.

1. The workspace title is **Country > Year > Area**. A sub-view bar offers
   **Country > YYYY-MM Area**, **Country > YYYY Area**, and **Country > Year > Area**.
2. The user expands a country, then a year (or month), then opens an area leaf.
3. The heading shows the place path (country > areas > city as applicable). Items are newest first.
4. **Back to smart albums** returns to the tree.

**Outcome:** a place-scoped grid without a hand-built album.

**Failure paths**

- No GPS countries → “No GPS countries found yet. Run metadata scan with GPS location detection…”

**Alternate paths**

- **Country > Area > City** → tree uses Area 1, Area 2 and City; at least one of those three
  levels must stay on.

### J-06-02-2 — Best photos of a year

**Trigger:** **Best of** → **Best of Year**.
**Preconditions:** dated media exists in the catalog.

1. Year cards show a cover, the year, item count, and how many have a manual vs AI rating.
2. Opening a year shows a paged grid ordered by star rating, then AI quality, then date.
3. **Randomize** (on by default) shuffles within the top 1000 of that ranking. **Refresh
   randomized order** picks a new shuffle; it is disabled while Randomize is off.

**Outcome:** a yearbook-style set, optionally varied.

**Failure paths**

- No dated media → “No dated media found yet. Run metadata scan to generate Best of Year…”

### J-06-02-3 — Best of a people group

**Trigger:** **Best of People group**.
**Preconditions:** at least one people group exists under **People**.

1. The filter panel opens automatically. Until a group is selected the grid says **Please select
   a people group** (or asks the user to create groups in People).
2. The user selects up to three groups. A photo must match **all** of them (intersection).
3. **Include unconfirmed similar faces** can widen each group’s people to suggested matches.

**Outcome:** a household (or other set) “best of” grid.

**Alternate paths**

- **Best of Person / People** → select 1–20 people instead; empty copy asks for a person tag, or
  to tag faces first. Location and date fields are on that panel only.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Smart root | Sidebar smart row | Title, subtitle, filter toggle; Randomize on best-of item views | `DesktopAlbumsWorkspaceHeader.tsx` |
| Place tree | Country roots | Expandable countries/groups, sub-view or hierarchy bar | `apps/desktop-media/src/renderer/components/smart-albums/` |
| Year cards | Best of Year with no year open | Cover, year, counts | `smart-album-best-of-year-cards.tsx` |
| Item grid | A leaf, year, or people query | Same content grid as manual albums, no drag-reorder | `DesktopAlbumContentGrid.tsx` |

**States**

| State | What the user sees |
|---|---|
| Loading | “Loading smart albums...” |
| Best of Person with no people chosen | Filter-panel guidance (amber when emphasised) |
| Best of People group with no groups in the library | “Please create people groups first in section People” |

**UX notes**

- Filter panel auto-opens for the three **Best of** roots, and stays closed for country roots.
  Defined in `apps/desktop-media/src/renderer/lib/smart-album-auto-open-filter-panel.ts`.
- Default year/area sub-view when entering **Country > Year > Area** is **month-area**.
- Place hierarchy defaults all of Area 1, Area 2 and City on.
- Smart item views do not show grid/list toggles in the smart header; they follow the app view
  mode if it was already set.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Place country roots query `location_source = 'gps'`. | Country albums follow camera GPS, not guessed path names. | `apps/desktop-media/electron/db/media-albums.ts` |
| BR-2 | Best-of (non-random) order is star rating, then AI aesthetic quality, then date, then path. | “Best” is the user’s rating first. | `media-albums.ts` |
| BR-3 | Randomize shuffles at most 1000 top-quality candidates; the same seed keeps page order stable until refresh. | Variety without scrambling the entire library. | `media-albums.ts`, `useSmartAlbums.ts` |
| BR-4 | Best of Person / People requires every selected person (AND), cap 20. Empty selection returns no items. | “These people together”, not “any of them”. | `media-albums.ts` |
| BR-5 | Best of People group requires every selected group (intersection), cap 3. Union is not offered. | A household is the overlap of its groups. | `media-albums.ts` |
| BR-6 | Place item grids order by capture/file date descending. | A place is browsed as a timeline. | `media-albums.ts` |
| BR-7 | Toggling off the last of Area 1 / Area 2 / City is refused. | The tree would have nothing to group by. | `apps/desktop-media/src/renderer/lib/smart-place-hierarchy.ts` |

## 8. Settings & defaults

Filter defaults and category exclusions are [F-06-03](03-album-filters-and-defaults.md).
**Randomize** defaults to on for a smart session. Year/area sub-view defaults to **month-area**.

## 9. Data & persistence

Smart albums store no membership. Expanded tree nodes, the open leaf, Randomize and the current
filter object are session UI only. Settings that seed those filters persist with app settings.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| [Location metadata](../02-catalog-and-metadata/04-location-metadata.md) | Country trees | GPS empty copy |
| [Folder scan](../02-catalog-and-metadata/01-folder-scan-and-catalog/README.md) | Dates for Best of Year | Dated-media empty copy |
| [People groups](../04-people-and-faces/05-people-groups.md) / person tags | People “best of” | Amber guidance to People |
| [AI image analysis](../03-ai-image-analysis/README.md) | Quality ranking and exclusions | Unanalysed photos lack AI rating and category |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `loadSmartAlbumPlaces` | grouping, `gps` / `non-gps`, filters | Country tree |
| `loadSmartAlbumYears` | filters | Year cards |
| `loadSmartAlbumItems` | `place` / `best-of-year` / `best-of-person-people` / `best-of-people-group` | Item page |

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| Integration | `apps/desktop-media/electron/db/media-albums.integration.test.ts` | Year/area/month grouping, GPS vs non-GPS, people intersection, randomize seed |
| Unit | `apps/desktop-media/src/renderer/components/DesktopSidebarAlbumsSection.test.tsx` | Five sidebar roots (not `ai-countries`) |
| Unit | `apps/desktop-media/src/renderer/lib/smart-place-hierarchy.test.ts`, `build-area-city-tree.test.ts` | Hierarchy toggles and area-city tree |
| Unit | `apps/desktop-media/src/renderer/lib/smart-album-auto-open-filter-panel.test.ts` | Which roots open the filter panel |

**Coverage gaps:** no E2E for opening a smart root or Randomize.

## 13. Known limitations & open questions

- **Limitation:** `ai-countries` (non-GPS source) is queryable but has no sidebar row.
- **Limitation:** smart grids cannot be drag-reordered (no stored positions).
- **Open question:** whether non-GPS countries should appear as their own **Countries** row.

## 14. References

- Module: [Albums](README.md)
- [Manual albums](01-manual-albums.md), [Album filters & defaults](03-album-filters-and-defaults.md)
- [Location metadata](../02-catalog-and-metadata/04-location-metadata.md)
- [People groups](../04-people-and-faces/05-people-groups.md)
