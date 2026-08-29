---
id: F-06-03
module: 06-albums
title: Album filters & defaults
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/shared/ipc.ts
  - apps/desktop-media/src/renderer/components/useSmartAlbums.ts
  - apps/desktop-media/src/renderer/components/BestOfYearFiltersPanel.tsx
  - packages/shared-contracts/src/domain/albums.ts
related:
  - F-06-01
  - F-06-02
  - F-01-06
  - F-03-01
---

# Album filters & defaults

> Narrow which albums appear in the list, which photos appear in a smart album, and what those
> smart filters start as — including hiding screenshots and documents by default.

## 1. Summary

Two filter surfaces sit on Albums, plus one Settings card that seeds the smart one. The **album
list** can be searched by title, by a place mentioned on any member, by a year or year-month
range, and by people. **Smart albums** have a filter strip for an optional text query, star
rating, AI rating, people (or people groups), and — on Best of Person / People — location and
dates. Settings → **Albums** stores the default star and AI ratings (none until the user sets
them) and which AI image categories to leave out of smart results. Category exclusions are merged
into every smart query so yearbooks and place grids stay photographic unless the user unchecks
them.

## 2. User stories

- **As someone with many albums** I want to find one by title, place, date or person, **so that**
  I do not scroll the whole card grid.
- **As a reviewer** I want smart albums to start from my usual rating bar, **so that** I am not
  resetting stars on every visit.
- **As someone browsing “best of”** I want screenshots and documents left out unless I ask,
  **so that** the grid is photos.

Thumbnail checkboxes that hide members inside an already-open album are
[Quick filters](../01-library-browsing-and-media-viewer/06-quick-filters.md), not this feature.

## 3. Scope

**In scope**

- Album list search strip: Title, Location, From/To, people, Include unconfirmed similar faces
- Smart filter panel: query, Rating, AI rating, people / groups, location and dates where shown
- Settings → **Albums**: Default Rating, Default AI rating, operators, excluded categories
- How settings seed a smart session, Clear filters, auto-open of the smart panel

**Out of scope**

- Building the smart trees and best-of ranking — see [Smart albums](02-smart-albums.md)
- Creating albums — see [Manual albums](01-manual-albums.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Quick filters on album/smart item grids | [Quick filters](../01-library-browsing-and-media-viewer/06-quick-filters.md) |
| AI categories produced per image | [AI image analysis](../03-ai-image-analysis/01-ai-image-analysis.md) |
| Settings screen chrome | [M-11](../11-settings-and-configuration/README.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-06-03.1 | Album list search | Title, location, YYYY / YYYY-MM range, people | shipped |
| F-06-03.2 | Smart filter panel | Query, ratings, people/groups; extra place/date on Best of Person / People | shipped |
| F-06-03.3 | Default ratings | Settings seed the smart panel; operators ≥ or = | shipped |
| F-06-03.4 | Category exclusions | Default patterns omit documents, screenshots, invoices, slides, diagrams | shipped |

## 5. User journeys

### J-06-03-1 — Find an album in a long list

**Trigger:** the user opens **ALL ALBUMS** (search strip opens) or taps the search control.
**Preconditions:** at least one album exists.

1. Typing in **Title** or **Location** waits 600 ms, then the card grid narrows.
2. **From** / **To** accept `YYYY` or `YYYY-MM` (hint when focused). An album matches if any
   member’s capture or file date falls in that range.
3. Toggling people is immediate. Each selected person must match (AND). **Include unconfirmed
   similar faces** is on by default and disabled until a person is selected.

**Outcome:** only matching albums remain; the badge on the search control shows how many
dimensions are active.

### J-06-03-2 — Set a default rating bar for smart albums

**Trigger:** Settings → **Albums** → **Default album filters**.

1. The user sets **Default Rating** and/or **Default AI rating** (stars) and clicks ≥ / =.
2. Opening a smart album seeds the filter panel from those values. Hint copy: “You can change
   the values in album filters panel.”
3. **Reset to defaults** on the Albums settings card restores no rating bar and the shipped
   category checkboxes.

**Outcome:** the next smart session starts at the user’s bar without re-clicking stars.

**Alternate paths**

- Settings ratings still `null` (shipped) → smart panel opens with no star or AI threshold.

### J-06-03-3 — Hide documents from Best of Year

**Trigger:** the user opens **Best of Year** with shipped exclusions still checked.

1. Year cards and item grids omit images whose AI category matches a checked pattern.
2. Unchecking **Document-like images** (or another row) includes those categories on the next
   query. Empty exclusion list means no category filter.

**Outcome:** keepers are photographs unless the user opts documents back in.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Album search strip | Search control, or **ALL ALBUMS** | Title, Location, From, To, people bar, unconfirmed checkbox | `DesktopAlbumsWorkspace.tsx` |
| Smart filter panel | Filter control on a smart root | **AI search prompt (optional)**, Rating **OR** AI rating, people; Clear filters | `BestOfYearFiltersPanel.tsx`, `BestOfPersonPeopleFiltersPanel.tsx` |
| Settings → Albums | Settings | Default Rating, Default AI rating, exclusion checkboxes, Reset | `DesktopSettingsSection.tsx` |

**States**

| State | What the user sees |
|---|---|
| Library has zero albums | Search strip is closed and cannot stay open |
| Unconfirmed checkbox with no people selected | Disabled; tooltip asks to select a person (or group) |
| Active filter fields | Highlighted input chrome |

**UX notes**

- The smart panel labels the text field **AI search prompt**; matching is a case-insensitive
  substring on filename, display title and AI title/description — not
  [AI image search](../05-search-and-discovery/README.md).
- Rating and AI rating are combined with a visible **OR**. An AND combination exists in the
  query layer but is not a control.
- AI rating stars map to an internal 1–10 aesthetic score (1★→1, 2★→3, … 5★→9).
- **Clear filters** on a smart panel wipes ratings and people/group picks; it does not re-apply
  Settings defaults. Include unconfirmed stays on.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Shipped smart settings: `defaultStarRating` and `defaultAiRating` are `null`; operators are `gte`. | No hidden rating floor until the user chooses one. | `apps/desktop-media/src/shared/ipc.ts` (`DEFAULT_SMART_ALBUM_SETTINGS`) |
| BR-2 | If the request omits `excludedImageCategories`, the shipped patterns apply. An explicit empty list excludes nothing. The desktop client always sends the Settings list. | Documents stay out of “best of” unless asked. | `packages/shared-contracts/src/domain/albums.ts`, `media-albums.ts` |
| BR-3 | Exclusion patterns are lowercased; `*` becomes a SQL `LIKE` wildcard. | `document*` and `*screenshot*` cover variants. | `media-albums.ts` |
| BR-4 | Album list From/To: `YYYY` is that calendar year; `YYYY-MM` is that month (UTC end-of-month). Invalid input is ignored. | Typed bounds stay simple. | `packages/shared-contracts/src/utils/album-date-filters.ts` |
| BR-5 | Album list people filters are AND across selected people. Unconfirmed similar faces are included only when that checkbox is on. | Precision vs recall is the user’s choice. | `media-albums.ts` |
| BR-6 | Star `eq` is exact; AI `eq` is a one-point band on the 1–10 score (`>= min` and `<= min+1`, capped at 10). Otherwise both use ≥. Unrated stars count as 0 when a star filter is on. | Equals on a continuous AI score would miss near-hits. | `media-albums.ts` |
| BR-7 | Changing Settings defaults updates an open smart panel only if its filters still match the previous defaults. | A user who already edited the panel is not overwritten. | `DesktopAlbumsWorkspace.tsx` |
| BR-8 | Best of Person / People does not also send `filters.personTagIds`; the selected people are the required-person list. | Avoids applying the same people twice. | `DesktopAlbumsWorkspace.tsx` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| Default Rating | None (`null`), operator ≥ | Seeds smart `starRatingMin` / `starRatingOperator` | No |
| Default AI rating | None (`null`), operator ≥ | Seeds smart AI threshold (stars → aesthetic min) | No |
| Document-like images | On (`document*`) | Excluded from smart queries | No |
| Screenshots | On (`*screenshot*`) | Excluded | No |
| Invoices and receipts | On (`invoice_or_receipt`) | Excluded | No |
| Presentation slides | On (`presentation_slide`) | Excluded | No |
| Diagrams | On (`diagram`) | Excluded | No |

Defined in `DEFAULT_SMART_ALBUM_SETTINGS` and `DEFAULT_SMART_ALBUM_EXCLUDED_IMAGE_CATEGORIES`.
Hint: “Checked image categories are automatically added to smart album filters… not available
for images that have not yet been analyzed.”

Include unconfirmed similar faces defaults to **on** in both list and smart filters.
Smart filter panel auto-open: **Best of** roots yes; country roots no.

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Smart album settings | App settings (`smartAlbums`) | Survives restart; seeds the next smart session |
| Album list / smart panel drafts | Session only | Lost when leaving the workspace |

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Person directory / face tags | People filters | Empty people bar |
| AI image analysis | Categories and AI rating | Unanalysed images have no category to exclude and no AI score |
| Dates and places in the catalog | List date/location and Person/People extra fields | Those filters match nothing |

## 11. Automatable actions & API surface

No separate action registry. List filters travel on `loadAlbums`; smart filters on
`loadSmartAlbumPlaces`, `loadSmartAlbumYears` and `loadSmartAlbumItems`. Settings changes go
through the desktop settings save path (`smartAlbumSettings` on the store).

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| Unit | `packages/shared-contracts/src/utils/album-date-filters.test.ts` | YYYY / YYYY-MM bounds |
| Unit | `apps/desktop-media/src/renderer/components/useSmartAlbums.test.ts` | Settings → filters; null ratings omitted |
| Unit | `apps/desktop-media/src/renderer/components/DesktopAlbumsWorkspace.test.tsx` | Person tag AND, unconfirmed default, page reset |
| Integration | `apps/desktop-media/electron/db/media-albums.integration.test.ts` | List location/date, exclusions, OR/AND rating logic, people + locationQuery |

**Coverage gaps:** no E2E that Settings defaults appear on a new smart panel, or that unchecking
a category brings documents back.

## 13. Known limitations & open questions

- **Limitation:** the panel shows a fixed **OR** between Rating and AI rating; AND is only in
  SQL/tests.
- **Limitation:** `DEFAULT_SMART_ALBUM_FILTERS` in `useSmartAlbums.ts` still encodes 3★ / AI 7
  as the hook’s fallback; the workspace always passes Settings (null ratings unless set).
- **Limitation:** location and date on the smart panel exist only for **Best of Person / People**,
  even though place and year queries accept the same filter object.
- **Open question:** whether **Clear filters** should restore Settings defaults instead of an
  empty rating bar.

## 14. References

- Module: [Albums](README.md)
- [Manual albums](01-manual-albums.md), [Smart albums](02-smart-albums.md)
- [Quick filters](../01-library-browsing-and-media-viewer/06-quick-filters.md)
- [AI image analysis](../03-ai-image-analysis/01-ai-image-analysis.md)
