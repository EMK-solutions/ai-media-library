---
id: F-05-01
module: 05-search-and-discovery
title: AI image search
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/SemanticSearchPanel.tsx
  - apps/desktop-media/src/renderer/hooks/use-semantic-handlers.ts
  - apps/desktop-media/electron/ipc/semantic-search-handlers.ts
  - apps/desktop-media/electron/db/search-fusion.ts
  - packages/media-store/src/slices/semantic-search.ts
related:
  - F-05-02
  - F-05-03
  - F-05-04
  - F-01-02
  - F-01-06
---

# AI image search

> Type what you remember seeing — a scene, an object, a mood — and get a ranked list of photos
> that match, without knowing the folder or filename.

## 1. Summary

AI image search is the panel opened from the toolbar search icon. The user types a plain-language
description, presses Search or Enter, and the media pane shows ranked photos instead of the
current folder. Matching is visual first: the query is compared with the search index built in
[Search indexing](02-search-indexing.md). When photos also have AI titles and descriptions, a
second list is built from those, and the two lists are fused so pictures that both *look like*
the query and *say so in text* rise.

Results use the same grid, list and viewer as browsing. Weak matches are hidden by similarity
floors in Settings, not shown as a long tail of poor hits. Filters and scope live in
[Search filters & scope](03-search-filters-and-scope.md). Re-ordering by extracted keywords is
optional and experimental — see [Keyword re-ranking](04-keyword-reranking.md).

This is the capability J-X1 step 3 is designed to unlock early.

## 2. User stories

- **As a photo owner** I want to describe a picture instead of hunting folders,
  **so that** I can find it from what I remember.
- **As a new user** I want a first search to work after indexing alone,
  **so that** I do not wait for overnight image analysis to try the product.
- **As someone checking results** I want to open a hit full screen and step through neighbours,
  **so that** I can judge whether the search understood me.

Not for: filename search, video content, or searching photos that have never been indexed.

## 3. Scope

**In scope**

- Opening and closing the search panel, submitting a query, clearing results
- Ranking from visual matching, description matching, and their fusion
- Hiding results below the visual and description similarity floors
- Showing results in the media grid and list, including score lines in list view
- Optional Translate to English before embedding the query

**Out of scope**

- Building the index — see [Search indexing](02-search-indexing.md)
- Scope, people and quick filters — see [Search filters & scope](03-search-filters-and-scope.md)
- Keyword re-ranking after fusion — see [Keyword re-ranking](04-keyword-reranking.md)
- Find similar from one photo — see [Find similar images](05-find-similar-images.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Grid, list and viewer for the result set | [Folder media browsing](../01-library-browsing-and-media-viewer/02-folder-media-browsing.md), [Media viewer](../01-library-browsing-and-media-viewer/03-media-viewer-and-slideshow.md) |
| Quick filters on the result set | [Quick filters](../01-library-browsing-and-media-viewer/06-quick-filters.md) |
| Settings UI | [M-11 Settings](../11-settings-and-configuration/README.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-05-01.1 | Query panel | Text field, Search, Clear results, status in the header | shipped |
| F-05-01.2 | Hybrid ranking | Visual and description lists fused into one order (Reciprocal Rank Fusion, k = 60) | shipped |
| F-05-01.3 | Visibility floors | Results below the visual and/or description thresholds are hidden | shipped |
| F-05-01.4 | Translate to English | Optional local-LLM rewrite of a non-English prompt before matching | shipped |
| F-05-01.5 | Matching method | When experimental advanced search is on: VLM + Description, VLM only, or Description only | experimental |

## 5. User journeys

### J-05-01-1 — First search after indexing

**Trigger:** the user has indexed a folder and clicks the toolbar search icon.
**Preconditions:** [folder scan](../02-catalog-and-metadata/01-folder-scan-and-catalog/README.md)
has run; [search indexing](02-search-indexing.md) has finished for that folder.

1. The **AI image search** panel opens above the media pane.
2. The user types a description (placeholder example: "Lady in white dress near piano") and
   presses Enter or **Search**.
3. Status shows "Searching...", then "Found N result(s)".
4. The grid shows ranked photos. Opening one carries the result list in the viewer.

**Outcome:** the user has found photos from a description, without image analysis.

**Alternate paths**

- No indexed images match → empty grid; status still reports a count of zero after floors.
- Results exist but all sit below the Settings floors → "Nothing found" plus copy pointing at
  Settings → AI image search.

**Failure paths**

- Empty query → Search stays disabled.
- Search already running → a second click is ignored.
- Embedding models not ready → the search fails and the panel status shows the error text.

### J-05-01-2 — Search in another language

**Trigger:** the user ticks **Translate to English** and searches in a non-English language.
**Preconditions:** Ollama is running with the configured translation model (default
`qwen2.5vl:3b`).

1. The query is sent to the local model for an English rewrite.
2. The English text is what gets matched against the index.
3. If translation succeeds, status can mention the original language; if it fails, the raw query
   is used and search still runs.

**Outcome:** a non-English prompt can still retrieve English-oriented index matches.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Search panel | Toolbar search icon | Title **AI image search**, status, close, query, Search, Clear results, scope, Translate to English | `apps/desktop-media/src/renderer/components/SemanticSearchPanel.tsx` |
| Result grid / list | After a search with visible hits | Same media pane as browsing; list rows show visual and description scores | `apps/desktop-media/src/renderer/components/DesktopMediaWorkspace.tsx` |
| Settings → **AI image search** | Settings sidebar | Intro copy, translation model, advanced thresholds | `apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx` |

**States**

| State | What the user sees |
|---|---|
| Panel closed | Folder contents as usual |
| Panel open, no results | Folder still showing; Clear results disabled |
| Searching | Search disabled; header "Searching..." |
| Hits after floors | Grid/list of results; header "Found N result(s)" |
| Hits all below floors | "Nothing found" / all results below similarity thresholds |
| Hits then quick-filtered to none | "No images match current filters" |

**UX notes**

- The search icon stays pressed while results are showing.
- Selecting a folder clears results and closes the panel.
- Clear results empties the list but leaves the panel open.
- List view labels visual score "Visual similarity score (VLM)" and description score
  "AI description match score (LLM)" — the second is a caption embedding, not a live chat model.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | An empty query is not submitted. | Prevents a full-library scan for nothing. | `apps/desktop-media/src/renderer/hooks/use-semantic-handlers.ts` |
| BR-2 | At most 100 results are requested and returned after fusion. | Keeps the grid usable. | `use-semantic-handlers.ts`; `semantic-search-handlers.ts` |
| BR-3 | Visual and description ranked lists are merged with Reciprocal Rank Fusion, k = 60, unless Matching method is restricted to one signal. | Items strong on both signals outrank items strong on only one. | `apps/desktop-media/electron/db/search-fusion.ts` |
| BR-4 | Full-text keyword search over AI captions runs in parallel and is not merged into the ranking. | Diagnostics without changing what the user sees. | `semantic-search-handlers.ts` |
| BR-5 | In hybrid mode a result stays visible if visual similarity ≥ the VLM floor **or** description similarity ≥ the description floor. | One good signal is enough to show a photo. | `apps/desktop-media/src/renderer/lib/ai-search-similarity-gate.ts` |
| BR-6 | Missing a score on one signal does not fail the other; missing both hides the item. | Unanalysed photos can still appear from vision alone. | `ai-search-similarity-gate.ts` |
| BR-7 | Translate to English defaults off; when on and analysis succeeds, the English query is embedded. | English-oriented models; opt-in latency and Ollama dependency. | `packages/media-store/src/slices/semantic-search.ts`; `semantic-search-handlers.ts` |
| BR-8 | Matching method is forced to hybrid unless Experimental - Advanced search is on. | Avoids a comparison control that most users do not need. | `SemanticSearchPanel.tsx` |
| BR-9 | Default search scope is the whole library. | The remembered photo may not be in the selected folder. | `packages/media-store/src/slices/semantic-search.ts` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| AI model to translate search prompt to English | `qwen2.5vl:3b` | Ollama model used when Translate to English (or experimental re-ranking) analyses the query | No |
| VLM (visual) similarity threshold | `0.04` | Hide results whose visual score is below this (hybrid: only if description also fails) | Yes |
| AI description similarity threshold | `0.6` | Hide results whose description score is below this (hybrid: only if visual also fails) | Yes |

Defined in `apps/desktop-media/src/shared/ipc.ts` (`DEFAULT_AI_IMAGE_SEARCH_SETTINGS`). Advanced
rows are hidden while **Hide advanced settings** is on (that toggle itself defaults on).

Panel defaults (session, not persisted): scope **Global**, Translate to English **off**, Matching
method **VLM + Description**.

## 9. Data & persistence

Search results and the open panel are session state in the media store. They do not survive
restart. The embeddings they query are stored by [Search indexing](02-search-indexing.md).
Settings above persist in app settings.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| [Search indexing](02-search-indexing.md) | Visual matches | Empty or very thin results |
| [AI image analysis](../03-ai-image-analysis/01-ai-image-analysis.md) plus a description embedding | Description matches | Vision-only ranking; description scores show as missing in list view |
| On-device Nomic text embedding | Turning the query into a vector | Search fails with an error in the panel status |
| Ollama + translation model | Translate to English | Search continues with the raw query |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `media:semantic-search-photos` | `query`, optional `limit` (UI uses 100), folder/people/date/location filters, `translateToEnglish`, `signalMode`, similarity and keyword-rerank fields | Run a search |
| `toggleSemanticPanel` / `setSemanticPanelOpen` | `open` | Open or close the panel |
| `setSemanticQuery` | `query` | Set the query text |
| `resetSemanticSearch` | — | Clear query, filters, results and status |

Store: `packages/media-store/src/slices/semantic-search.ts`. Renderer submit:
`use-semantic-handlers.ts`.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/semantic-search.spec.ts` | Indexing, prompt ranking, grid results, hide-all-results via thresholds |
| E2E | `apps/desktop-media/tests/e2e/search-timing-diag.spec.ts` | Timing from Search click to painted results |
| Unit | `apps/desktop-media/electron/db/search-fusion.test.ts` | RRF empty lists, single list, multi-list boost, k smoothing |
| Unit | `apps/desktop-media/electron/db/hybrid-search.integration.test.ts` | Fusion of vision and description ranks |
| Unit | `apps/desktop-media/src/renderer/lib/ai-search-similarity-gate.test.ts` | Hybrid OR floors, missing scores, single-signal modes |
| Unit | `packages/media-store/src/slices/semantic-search.test.ts` | Default matching method hybrid |

**Coverage gaps:** Translate to English and Matching method have no dedicated E2E.

## 13. Known limitations & open questions

- **Limitation:** ranking is not guaranteed to match any one score the user sees in list view;
  list rows show raw visual and description cosines, while order is fused.
- **Limitation:** search work grows with how many embeddings are in scope; there is no separate
  approximate index the user can turn on.
- **Open question:** whether the queued image-analysis job should always write the description
  embedding so hybrid search improves without a backfill — see F-05-02.

## 14. References

- Module: [Search & Discovery](README.md)
- [Search indexing](02-search-indexing.md), [Search filters & scope](03-search-filters-and-scope.md)
- Recommended setup: [`../JOURNEYS.md`](../JOURNEYS.md) J-X1 step 3, J-X2
- Implementation history: `docs/IMPLEMENTATION-LOG/features/2026-03_contextual_image_search_*.plan.md`,
  `docs/IMPLEMENTATION-LOG/features/2026-03_ai_search_enhancements_*.plan.md`
