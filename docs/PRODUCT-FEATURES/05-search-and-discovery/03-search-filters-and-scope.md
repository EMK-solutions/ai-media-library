---
id: F-05-03
module: 05-search-and-discovery
title: Search filters & scope
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/SemanticSearchPanel.tsx
  - apps/desktop-media/src/renderer/components/semantic-search-person-tags-bar.tsx
  - apps/desktop-media/electron/db/semantic-search.ts
  - apps/desktop-media/src/renderer/hooks/use-semantic-handlers.ts
  - packages/media-store/src/slices/semantic-search.ts
related:
  - F-05-01
  - F-01-06
  - F-04-04
  - F-04-06
---

# Search filters & scope

> Decide *where* and *who* a search looks at, then use the same quick filters as browsing to
> hide results that are still not what you meant.

## 1. Summary

A query without constraints searches the whole library. The search panel lets the user restrict
that to the selected folder, or the selected folder and everything under it, and — when people
exist — to photos that include one or more named people. Those constraints apply **before**
ranking, so the fused list is already in the right place and about the right people.

Toolbar [quick filters](../01-library-browsing-and-media-viewer/06-quick-filters.md) then apply
**after** weak matches have been hidden: people-count, rating, category, documents, years and
location on the visible hits. Year and location from that menu are also sent into the search
itself, so those two dimensions trim candidates rather than only the finished list.

## 2. User stories

- **As someone who knows the event folder** I want to search only there,
  **so that** a common scene does not pull in twenty years of look-alikes.
- **As a family organiser** I want to require every selected person to be in the photo,
  **so that** "holiday" means that group together, not each of them separately.
- **As someone still teaching faces** I want unconfirmed look-alikes included,
  **so that** I do not have to tag hundreds of faces before search is useful.
- **As someone narrowing a noisy result** I want the same quick filters as the folder grid,
  **so that** I do not rephrase the query for "only four stars" or "only invoices".

Not for: filtering albums or the People workspace; those have their own filter bars.

## 3. Scope

**In scope**

- Search scope radios: Global, Selected folder, Selected folder with sub-folders
- Person-tag chips (multi-select, AND) and **Include unconfirmed similar faces**
- How toolbar quick filters combine with search (after similarity floors; years/location also
  at query time)

**Out of scope**

- The query box, ranking and similarity floors — see [AI image search](01-ai-image-search.md)
- The quick-filter menu's choices and predicates — see
  [Quick filters](../01-library-browsing-and-media-viewer/06-quick-filters.md)
- Creating people or confirming faces — see
  [Person directory](../04-people-and-faces/04-person-directory.md) and
  [Face tagging](../04-people-and-faces/06-face-tagging-and-suggestions.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Suggestion index used when unconfirmed is on | [Face recognition](../04-people-and-faces/02-face-recognition.md) |
| Resetting filters when entering or leaving search results | [Quick filters](../01-library-browsing-and-media-viewer/06-quick-filters.md) BR-14 |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-05-03.1 | Search scope | Whole library, this folder, or this folder plus subfolders | shipped |
| F-05-03.2 | Person tags | Multi-select chips; a photo must match every selected person | shipped |
| F-05-03.3 | Unconfirmed faces | Optional inclusion of suggested (not yet tagged) person matches | shipped |
| F-05-03.4 | Quick filters on results | Same toolbar filters as browsing, after similarity hiding | shipped |
| F-05-03.5 | Date and location at search time | Event-year and location text from quick filters restrict candidates | shipped |

## 5. User journeys

### J-05-03-1 — Search one trip folder

**Trigger:** a folder is selected; the user opens AI image search.
**Preconditions:** that folder (or its children) has been indexed.

1. **Selected folder** and **Selected folder with sub-folders** become enabled.
2. The user picks **Selected folder with sub-folders** and searches.
3. Only photos under that folder prefix are eligible.

**Outcome:** results stay inside the trip.

**Alternate paths**

- No folder selected → folder radios stay disabled (tooltip "Select a folder first"); scope
  remains Global.
- **Selected folder** (not recursive) → photos in nested directories are excluded.

**Failure paths**

- Folder has no indexed images → empty results, same as an unmatched query.

### J-05-03-2 — People in the search

**Trigger:** the library has at least one person tag.
**Preconditions:** faces have been detected and some faces tagged.

1. A **Person tags** row appears (name filter, optional Show all / Hide all, chips).
2. The user selects one or more people. **Include unconfirmed similar faces** becomes enabled
   (it is checked by default for new sessions).
3. Search runs. Each selected person must be present on the photo, either as a confirmed tag or
   — if unconfirmed is on — as a stored suggestion.
4. Turning unconfirmed off restricts hits to confirmed tags only.

**Outcome:** the result list is about those people.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Scope row | Search panel | Radios **Global** / **Selected folder** / **Selected folder with sub-folders** | `SemanticSearchPanel.tsx` |
| Person tags | Search panel, when any people exist | Heading **Person tags**, Name filter, chips | `semantic-search-person-tags-bar.tsx` |
| Unconfirmed toggle | Search panel, always shown | **Include unconfirmed similar faces**; disabled with tooltip until a person is selected | `SemanticSearchPanel.tsx` |
| Quick filters | Toolbar funnel | Same menu as folder browsing | `QuickFiltersMenu.tsx` |

**States**

| State | What the user sees |
|---|---|
| No people in the library | Person tags bar omitted; unconfirmed toggle disabled |
| People exist, none selected | Chips; unconfirmed disabled ("Select at least one person tag") |
| One or more people selected | Chips highlighted; unconfirmed enabled |
| Quick filters hide every remaining hit | "No images match current filters" |

**UX notes**

- Person chips follow the same collapse rules as **People → Tagged faces** (pinned first, then
  recent, then by tagged-face count), except several people can be selected at once and
  selected chips stay visible when the list is collapsed.
- Unconfirmed is a search/filter signal only; it never tags a face.
- Quick filters reset when the pane switches into or out of search results.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Default scope is **global**. | The photo may not be in the folder currently open. | `packages/media-store/src/slices/semantic-search.ts` |
| BR-2 | Folder-scoped radios are disabled until a folder is selected. | There is no folder path to constrain. | `SemanticSearchPanel.tsx` |
| BR-3 | Non-recursive folder scope keeps only files whose parent directory is exactly the selected folder. | "This folder" must not silently include nested events. | `apps/desktop-media/electron/db/semantic-search.ts` |
| BR-4 | Multiple person tags combine with AND: every selected person must match the same photo. | "Alice and Bob" is not "Alice or Bob". | `semantic-search.ts` person-tag `EXISTS` loop |
| BR-5 | Unconfirmed matching is off unless at least one person is selected **and** the include flag is true on the request. | Avoids expanding the whole library to suggestions. | `semantic-search-handlers.ts` |
| BR-6 | Include unconfirmed similar faces defaults **on** for a new session. | Recall while the user is still confirming faces. | `semantic-search.ts` store |
| BR-7 | When unconfirmed is on, each person matches a confirmed face tag **or** a row in the person-suggestion table. Suggestions may be filled lazily at search time using the face-recognition similarity threshold (default **0.38**). | Uses the same suggestion store as Tagged faces. | `semantic-search.ts`; `semantic-search-handlers.ts` |
| BR-8 | Quick filters apply to search results after similarity floors. | The count the user sees is what is on screen. | `use-filtered-media-items.ts` |
| BR-9 | Event year range and location text from quick filters are also sent as search constraints. | Better ranking in a smaller candidate set. | `quickFiltersToSearchEventLocationExtras`; `use-semantic-handlers.ts` |

## 8. Settings & defaults

None of these controls have their own Settings page. Session defaults:

| Control | Default |
|---|---|
| Scope | Global |
| Person tags | None selected |
| Include unconfirmed similar faces | On |

Face-recognition similarity used when filling suggestions is Settings → **Face recognition**
(default **0.38**), owned by [M-04](../04-people-and-faces/README.md).

## 9. Data & persistence

Scope, selected person ids and the unconfirmed flag live in the session store and reset on
restart. Suggestion rows used for unconfirmed matching persist in
`media_item_person_suggestions` (owned by People & Faces). Quick filter state is also session
only and is cleared when entering or leaving search results.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| A selected folder | Folder-scoped radios | Radios disabled; search stays global |
| Person tags in the catalog | Person chips | Bar hidden |
| Suggestion index / recognition threshold | Unconfirmed expansion | Confirmed tags still match; unconfirmed side stays empty until suggestions exist |
| Catalog dates and places | Year/location constraints | Those filters exclude items that lack the field |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `setSemanticSearchScope` | `global` \| `selected` \| `recursive` | Change scope |
| `setSemanticPersonTagIds` | `ids` | Set the AND person filter |
| `setSemanticIncludeUnconfirmedFaces` | `include` | Expand or restrict person matching |
| `media:semantic-search-photos` | `folderPath`, `recursive`, `personTagIds`, `includeUnconfirmedFaces`, `eventDateStart`, `eventDateEnd`, `locationQuery` | Apply constraints server-side |

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/unconfirmed-face-search.spec.ts` | Person-tag filter expands when unconfirmed is included |
| E2E | `apps/desktop-media/tests/e2e/quick-filters.spec.ts` | Quick filters apply on the search path |
| Unit | `apps/desktop-media/src/renderer/lib/semantic-search-person-groups-visible.test.ts` | Visibility helpers (used by other surfaces; person-tag search uses `tagged-faces-tab-visible-tags.ts`) |

**Coverage gaps:** no E2E for the three scope radios, for AND across two people, or for
unconfirmed default-on vs toggling off in the UI without fixtures.

## 13. Known limitations & open questions

- **Limitation:** there is no badge on a search result showing confirmed vs unconfirmed person
  matches (older notes treated that as future work).
- **Limitation:** person **groups** are not a control in the AI image search panel (a groups bar
  exists for album / best-of filters, not here).
- **Open question:** whether people, rating and category should also pre-filter candidates the
  way year and location already do.

## 14. References

- Module: [Search & Discovery](README.md)
- [AI image search](01-ai-image-search.md)
- [Quick filters](../01-library-browsing-and-media-viewer/06-quick-filters.md)
