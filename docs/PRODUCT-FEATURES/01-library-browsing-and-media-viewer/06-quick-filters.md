---
id: F-01-06
module: 01-library-browsing-and-media-viewer
title: Quick filters
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/QuickFiltersMenu.tsx
  - packages/media-metadata-core/src/thumbnail-quick-filters.ts
  - apps/desktop-media/src/renderer/hooks/use-filtered-media-items.ts
  - apps/desktop-media/src/renderer/App.tsx
related:
  - F-01-02
  - F-01-05
---

# Quick filters

> Narrow the pane to what you are actually looking for — photos with people, your four-star
> keepers, invoices, or everything from a particular place — without running a search.

## 1. Summary

Quick filters are a set of checkboxes in a small menu above the media pane. Each one narrows what
the pane shows: how many people are in the picture, the user's own star rating, the AI's quality
rating, the kind of document, the visual category, the years an event covers, and whether the
place contains a piece of text. Every filter is a checkbox plus a choice, so the user turns a
dimension on and then picks the band they want — "≥ 4" stars, "= 2" people, "Invoices /
receipts", "Nature".

Filters are non-destructive and instant: nothing is moved or changed, the pane simply shows less,
and the toolbar reports how much less by displaying, for example, "Filtered: 18/240". They apply
both to a folder's contents and to AI search results, so the same controls narrow a search as
narrow a folder. When a search is run or dismissed the filters reset to their defaults, so a
narrow filter set never silently carries over into a different context.

Most filters read values produced by AI processing, so they are only useful once the relevant
pipelines have run. The star rating filter is the exception: it works as soon as a folder has been
scanned.

## 2. User stories

- **As someone with a large folder** I want to see only the pictures with people in them,
  **so that** I can skip the scenery.
- **As someone reviewing my own ratings** I want to see only four stars and above, **so that** I
  can work with the keepers.
- **As someone looking for paperwork** I want to isolate invoices and receipts, **so that** the
  documents in a photo folder do not have to be hunted for.
- **As someone narrowing a search** I want the same filters over search results, **so that** I do
  not have to keep rephrasing the query.
- **As someone who filtered too hard** I want one click to clear everything, **so that** I can get
  back to the whole folder.

## 3. Scope

**In scope**

- The quick filters menu, its filters and the choices within each
- How filters combine, and what happens to items that lack the value being filtered on
- Applying filters to a folder and to AI search results
- The active-filter badge and the filtered count
- Clearing all filters, and when they reset by themselves

**Out of scope**

- The grid and list themselves — see [Folder media browsing](02-folder-media-browsing.md)
- Setting star ratings — see [Star rating](05-star-rating.md)
- Running an AI search — owned by [M-05 Search & Discovery](../05-search-and-discovery/README.md)
- Album filter panels, which are a separate control set — owned by
  [M-06 Albums](../06-albums/README.md)
- The AI values being filtered on — owned by
  [M-03 AI Image Analysis](../03-ai-image-analysis/README.md) and
  [M-04 People & Faces](../04-people-and-faces/README.md)

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-01-06.1 | People filter | Only pictures with no people, or with at least or exactly one to five people | shipped |
| F-01-06.2 | Documents filter | Only invoices and receipts, IDs, other documents, or all document-like images | shipped |
| F-01-06.3 | Rating filter | Only items at or above, or exactly at, a star count, or only unrated items | shipped |
| F-01-06.4 | AI rating filter | The same bands applied to the AI's quality assessment | shipped |
| F-01-06.5 | Categories filter | One visual category at a time: architecture, food, humor, nature, other, pet, sports | shipped |
| F-01-06.6 | Event years filter | Only items whose event dates overlap a year range | shipped |
| F-01-06.7 | Location contains filter | Only items whose recorded place contains a piece of text | shipped |
| F-01-06.8 | Filters over search results | The same filters narrow AI search results | shipped |
| F-01-06.9 | Clear all filters | One action returns the pane to unfiltered | shipped |
| F-01-06.10 | OR / AND choice | A control offering to combine filters either way | experimental |

## 5. User journeys

### J-01-06-1 — Find the photos with people in a big folder

**Trigger:** the user has a folder of hundreds of pictures and wants only the ones with people.
**Preconditions:** face detection or AI image analysis has run on the folder, otherwise no item
has a people count.

1. The user clicks the filter button in the toolbar; the quick filters menu opens.
2. The user ticks **People**. The choice beside it already reads "≥ 1", the default, so the pane
   narrows immediately.
3. The filter button gains a badge showing one active filter, and the toolbar reads
   "Filtered: 64/312".
4. To be stricter, the user changes the choice to "≥ 3"; the pane narrows again. Changing a
   choice also turns its filter on if it was off.
5. Clicking **Clear all filters** at the bottom restores the whole folder.

**Outcome:** the pane shows only pictures with people, and it is obvious how many were hidden.

**Alternate paths**

- The folder has not been processed → nothing matches, and the pane reads "No images match
  current filters".
- The user picks "None" → only pictures the app is confident contain no people are shown.

### J-01-06-2 — Work with your own best photos

**Trigger:** the user has rated a folder and wants to see only the good ones.

1. The user opens the quick filters menu and ticks **Rating**, whose default choice is "≥ 4".
2. The pane narrows to four- and five-star items.
3. Unrated items disappear; so do items rated one to three.
4. Switching the choice to "None" inverts the task and shows only the items still waiting to be
   rated.

**Outcome:** rating and reviewing become a loop the user can run folder by folder.

**Alternate paths**

- The user wants the app's opinion rather than their own → **AI Rating** offers the same bands
  over the AI quality score, and requires AI image analysis to have run.

### J-01-06-3 — Pull the paperwork out of a photo folder

**Trigger:** a folder mixes receipts and snapshots.

1. The user ticks **Documents**; the default choice, "All", covers every document-like kind:
   invoices and receipts, identity documents, contracts, other documents, presentation slides,
   diagrams and screenshots.
2. Narrowing the choice to "Invoices / receipts" leaves only those.
3. Opening one shows its extracted invoice fields in the info panel.

**Outcome:** documents are separable from photographs without moving any file. See
[M-07 Documents](../07-documents/README.md) for what is done with them afterwards.

### J-01-06-4 — Narrow a search you already ran

**Trigger:** an AI image search returned too much.

1. The user runs a search; results fill the pane.
2. Opening the quick filters menu and ticking **Rating** narrows the results the same way it
   narrows a folder, and the toolbar count now compares against the number of results.
3. For **Event years** and **Location contains**, the values are also passed into the search
   itself, so the search engine narrows before ranking rather than only afterwards.
4. Dismissing the search and returning to the folder resets every filter to its default.

**Outcome:** search and filters compose, and neither leaks its settings into the other.

### J-01-06-5 — Find everything from one place or period

**Trigger:** the user remembers roughly when and where, but not what the photos look like.

1. The user ticks **Event years (database)** and types a start and end year.
2. Items whose event dates overlap that range at all are kept, so a multi-day or multi-year event
   still matches a narrower filter.
3. The user also ticks **Location contains** and types "Paris"; only items whose recorded country,
   region, city, place or location name contains that text remain.

**Outcome:** time and place become usable filters even without a search query.

**Alternate paths**

- The item has no event date recorded → it is excluded while the year filter is on.
- The location box is left empty → the filter counts as active in the badge but excludes nothing.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Filter button | Toolbar above the pane | Funnel icon, highlighted while any filter is active, with a badge counting active filters | `apps/desktop-media/src/renderer/components/DesktopMainToolbar.tsx` |
| Quick filters menu | Clicking the filter button | Title "Quick filters", five checkbox-and-choice rows, the date and location block, the OR / AND control, and "Clear all filters" | `apps/desktop-media/src/renderer/components/QuickFiltersMenu.tsx` |
| Filtered count | Toolbar, beside the folder path | "Filtered: 18/240" whenever a filter is active and the pane has items | `apps/desktop-media/src/renderer/components/DesktopMainToolbar.tsx` |
| Filtered-out state | Every item hidden | "No images match current filters" | `apps/desktop-media/src/renderer/components/DesktopMediaWorkspace.tsx` |

**Filters and their choices**

| Filter (UI label) | Default choice | Choices | Reads |
|---|---|---|---|
| People | ≥ 1 | None, and at-least or exactly one to five | The people count from AI image analysis, otherwise the number of detected faces |
| Documents | All | All, Invoices / receipts, IDs, Other documents | The image category from AI image analysis |
| Rating | ≥ 4 | None, exactly or at-least one to five | The user's star rating in the catalog |
| AI Rating | ≥ 4 | None, exactly or at-least one to five | The AI quality score, converted to a one-to-five scale |
| Categories | Nature | Architecture, Food, Humor, Nature, Other, Pet, Sports | The image category from AI image analysis |
| Event years (database) | Off, both years empty | A start year and an end year | The event dates in the catalog |
| Location contains | Off, empty text | Free text | The country, region, city, place and location name in the catalog |

**UX notes**

- Each filter is a checkbox and a choice. Ticking the checkbox applies the choice already shown;
  changing the choice also ticks the checkbox, so a filter is never chosen without taking effect.
- The badge on the filter button counts the enabled filters, not the number of items hidden, so
  the user can see at a glance how many dimensions are in play.
- The year and location controls only reveal their inputs once their checkbox is ticked, keeping
  the menu compact.
- "Clear all filters" is disabled when nothing is active, so it never looks like a live control
  with nothing to do.
- The menu and the toolbar's more-actions menu are mutually exclusive: opening one closes the
  other.
- The choice lists are custom dropdowns rather than native selects, and close on Escape or on a
  click outside.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Every enabled filter must match for an item to be shown; the filters are combined with AND. | A user adding a second filter expects a narrower result, not a wider one. | `packages/media-metadata-core/src/thumbnail-quick-filters.ts` |
| BR-2 | With no filter enabled, every item is shown and no filtering work is done. | Browsing an unfiltered folder must not pay for the filtering machinery. | `apps/desktop-media/src/renderer/hooks/use-filtered-media-items.ts` |
| BR-3 | Choosing a value in any filter's dropdown enables that filter. | Removes a two-step interaction where picking a band appeared to do nothing. | `apps/desktop-media/src/renderer/components/QuickFiltersMenu.tsx` |
| BR-4 | An item with no value for an enabled filter is excluded, except under the "None" and "unrated" choices, which select exactly those items. | Unknown must not be treated as a match, or an unprocessed folder would look fully filtered. | `packages/media-metadata-core/src/thumbnail-quick-filters.ts` |
| BR-5 | The people count comes from AI image analysis when available, then from the number of detected faces, then from a people count carried on a search result, then from the number of face boxes in the analysis record. | Uses whichever pipeline has run, so the filter is useful earlier in the setup path. | `packages/media-metadata-core/src/thumbnail-quick-filters.ts` |
| BR-6 | While the people filter is on, images classified as identity documents are always excluded. | Photographs of passports contain a face but are not pictures of people. | `packages/media-metadata-core/src/thumbnail-quick-filters.ts` |
| BR-7 | The rating filter uses only the user's own star rating, and treats rejected and unrated alike as having no rating. It never falls back to any AI value. | The user's judgement and the model's must stay separable. | `packages/media-metadata-core/src/thumbnail-quick-filters.ts` |
| BR-8 | The AI rating filter converts the model's ten-point quality score into one to five stars by halving and rounding up. | Puts both rating filters on the same scale so the choices can be shared. | `packages/media-metadata-core/src/thumbnail-quick-filters.ts` |
| BR-9 | The categories filter offers only non-document visual classes; document-like classes live under Documents. | Prevents the same image appearing under two competing dimensions. | `packages/media-metadata-core/src/thumbnail-quick-filters.ts` |
| BR-10 | The year filter keeps an item when its event date range overlaps the filter range at any point; an empty start or end year is treated as unbounded. | Multi-day and year-only events must still match a narrower query. | `packages/media-metadata-core/src/thumbnail-quick-filters.ts` |
| BR-11 | The location filter is a case-insensitive substring match against the item's country, city, region, place and location name combined; an empty box excludes nothing. | Users type fragments such as "par" rather than exact administrative names. | `packages/media-metadata-core/src/thumbnail-quick-filters.ts` |
| BR-12 | The same filters are applied to AI search results after the similarity threshold has removed weak matches. | The filtered count then describes the results the user can actually see. | `apps/desktop-media/src/renderer/hooks/use-filtered-media-items.ts` |
| BR-13 | The year range and location text are additionally passed to the search itself as date and location constraints. | Narrowing before ranking gives better results than discarding afterwards. | `packages/media-metadata-core/src/thumbnail-quick-filters.ts`, `apps/desktop-media/src/renderer/hooks/use-desktop-pipeline-handlers.ts` |
| BR-14 | All filters reset to their defaults whenever the pane switches into or out of search results. | Filters chosen for a search must not silently constrain the next folder, and the reverse. | `apps/desktop-media/src/renderer/App.tsx` |
| BR-15 | Filters survive switching between grid and list, and are not saved between sessions. | Presentation is not a context change; a new session should start unfiltered. | `apps/desktop-media/src/renderer/App.tsx` |

## 8. Settings & defaults

None — this feature exposes no user settings. Its shipped starting state is:

| Filter | Enabled by default | Default choice |
|---|---|---|
| People | No | ≥ 1 |
| Documents | No | All |
| Rating | No | ≥ 4 |
| AI Rating | No | ≥ 4 |
| Categories | No | Nature |
| Event years | No | No years entered |
| Location contains | No | Empty |
| Multi-choice mode | — | OR |

Defined in `packages/media-metadata-core/src/thumbnail-quick-filters.ts`
(`DEFAULT_THUMBNAIL_QUICK_FILTERS`). Album filter panels have their own separate defaults in
Settings, including a default rating and default AI rating; those belong to
[M-06 Albums](../06-albums/README.md).

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| The current filter selection | Session state only, held by the main screen | Filters are lost on restart and reset when the pane switches between folder and search |
| The values filtered on | Local catalog database | Filters can only see what the pipelines have already written |

Filtering never writes anything.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| [M-02 Catalog & Metadata](../02-catalog-and-metadata/README.md) | Star rating, event dates and places | The rating, year and location filters match nothing |
| [M-03 AI Image Analysis](../03-ai-image-analysis/README.md) | Categories, documents, AI rating, and the preferred people count | Those filters match nothing until analysis has run |
| [M-04 People & Faces](../04-people-and-faces/README.md) | The people count before AI image analysis has run | The people filter matches nothing until faces are detected |

Because the AI-derived filters depend on the slowest pipeline, the recommended setup order in
[`../JOURNEYS.md`](../JOURNEYS.md) matters here: the rating filter works after step 2, the people
filter after step 4, and the category, document and AI rating filters only after step 5.

## 11. Automatable actions & API surface

| Action / function | Parameters | Intent |
|---|---|---|
| `matchesThumbnailQuickFilters` | item values, filter state | Decide whether one item passes the current filters |
| `countActiveQuickFilters` | filter state | Number shown on the filter button's badge |
| `hasActiveQuickFilters` | filter state | Whether any filtering is in effect |
| `quickFiltersToSearchEventLocationExtras` | filter state | Convert the year range and location text into search constraints |
| `DEFAULT_THUMBNAIL_QUICK_FILTERS` | — | The cleared state, also used by "Clear all filters" |

All exported from `packages/media-metadata-core/src/thumbnail-quick-filters.ts`.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/quick-filters.spec.ts` | The People, Documents, AI Rating and Categories filters narrowing the thumbnails, and filters resetting when returning from search results to a folder |
| Unit | `apps/desktop-media/src/renderer/lib/invoice-receipt-filter-count.test.ts` | Counting active filters in the invoice and receipt screen, which reuses the same filter vocabulary |

**Coverage gaps:** there is no unit test for the filter predicate itself, so the year-overlap
rule, the location substring match, the identity-document exclusion and the fallback order for
the people count are untested.

## 13. Known limitations & open questions

- **Limitation:** the OR / AND control in the menu has no effect. Whichever option is selected,
  every enabled filter must still match, and the control is not counted as an active filter. It
  is presented as a working choice, so it currently misleads.
- **Limitation:** the label on that control is misspelled as "Mutli-choice:".
- **Limitation:** each dimension allows only one choice — one category, one document kind, one
  rating band. There is no way to ask for "nature or pets", or for "three or five stars".
- **Limitation:** filters cannot be inverted, there is no filter for media kind so photos and
  videos cannot be separated, and filters cannot be saved, named or reused.
- **Limitation:** the reset on entering or leaving search results is not announced, so a user who
  had carefully set filters loses them without warning.
- **Limitation:** opening the viewer from a filtered pane still navigates the unfiltered folder,
  so paging forward can reach hidden items.
- **Open question:** the "Event years (database)" label exposes internal vocabulary and does not
  explain which dates it means; the user-facing name for that dimension is undecided.

## 14. References

- Module: [Library Browsing & Media Viewer](README.md)
- [Folder media browsing](02-folder-media-browsing.md) — the pane the filters narrow
- [Star rating](05-star-rating.md) — the value behind the rating filter
- [M-05 Search & Discovery](../05-search-and-discovery/README.md) — filters over search results
- [M-07 Documents](../07-documents/README.md) — what happens after documents are isolated
- Recommended setup order: [`../JOURNEYS.md`](../JOURNEYS.md) — determines which filters work yet
- Shared vocabulary: [`../GLOSSARY.md`](../GLOSSARY.md) — quick filters, image category,
  AI rating, star rating
