---
id: F-05-04
module: 05-search-and-discovery
title: Keyword re-ranking
status: experimental
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/electron/db/keyword-reranker.ts
  - apps/desktop-media/electron/ipc/semantic-search-handlers.ts
  - apps/desktop-media/electron/query-understanding.ts
  - apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx
  - apps/desktop-media/src/shared/ipc.ts
related:
  - F-05-01
  - F-05-03
  - F-03-01
---

# Keyword re-ranking

> After a normal fused ranking, optionally push photos that match more of the query's key
> concepts toward the top — an experimental setting, off by default.

## 1. Summary

Turning on **Experimental - Advanced search** in Settings does two visible things: the search
panel gains a **Matching method** control, and — when a search runs — a local Ollama model may
extract short English keywords from the query. If re-ranking is allowed to proceed, results are
sorted by how many of those keywords "hit" the photo (visual embedding, caption embedding, or
either), and only then by the fused score.

This is **not** implied by **Translate to English** alone, and it is **not** SQLite full-text
search. Full-text still runs in the background for diagnostics and never changes order.
Re-ranking needs Ollama, at least one extracted keyword, and at least one keyword-match
threshold greater than zero.

## 2. User stories

- **As someone whose fused results look "close but wrong"** I want photos that contain more of
  the named objects to rise,
  **so that** "red sled and two children" beats a generic snow scene.
- **As someone comparing signals** I want to search with vision only or description only,
  **so that** I can see which index is carrying the query.

Not for: everyday search. The control is labelled experimental and ships off.

## 3. Scope

**In scope**

- Settings toggle **Experimental - Advanced search** and the two keyword-match thresholds
- Matching method in the search panel when that toggle is on
- When re-ranking runs, how a keyword "hit" is counted, and the sort order
- What happens when Ollama or keyword extraction fails

**Out of scope**

- Default hybrid ranking — see [AI image search](01-ai-image-search.md)
- Translate to English (can share the same LLM call, but does not re-rank by itself)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Similarity floors that hide rows | [AI image search](01-ai-image-search.md) |
| Settings screen chrome | [M-11](../11-settings-and-configuration/README.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-05-04.1 | Experimental toggle | Enables LLM keyword extraction for re-ranking and shows Matching method | experimental |
| F-05-04.2 | Keyword hits | Per-keyword match against visual and/or description embeddings | experimental |
| F-05-04.3 | Matching method | VLM + Description (OR hits), VLM only, or Description only | experimental |

## 5. User journeys

### J-05-04-1 — Turn on experimental re-ranking

**Trigger:** the user unhides advanced settings and enables **Experimental - Advanced search**.
**Preconditions:** Ollama is running; the translation/analysis model is installed (default
`qwen2.5vl:3b`).

1. **Hide advanced settings** is turned off so the AI image search advanced block is visible.
2. The user ticks **Experimental - Advanced search**. Keyword match threshold fields appear
   (VLM default **0.05**, AI Description default **0.5**).
3. In the search panel, **Matching method** appears (default **VLM + Description**).
4. They search. If the model returns keywords, status can list them; results are ordered by
   keyword hit count, then by fused score.
5. If the model is down or returns no keywords, order stays the fused ranking (same as the
   setting off).

**Outcome:** conceptually richer queries can surface photos that pack more of the named ideas.

**Failure paths**

- Both keyword thresholds set to **0** → re-ranking is skipped even if keywords exist.
- LLM parse failure → raw query is embedded; no re-rank; search still returns fused results.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Settings → **AI image search** | Settings, advanced block | **Experimental - Advanced search**, optional ? description, keyword thresholds | `DesktopSettingsSection.tsx` |
| Matching method | Search panel, only when the setting is on | Select **VLM + Description** / **VLM only** / **Description only** | `SemanticSearchPanel.tsx` |

**States**

| State | What the user sees |
|---|---|
| Setting off (default) | No Matching method; fused hybrid order |
| Setting on, LLM keywords | Status may include `keywords: …`; order may change |
| Setting on, no keywords / no Ollama | Fused order; logs skip re-rank (not a user error toast) |

**UX notes** — the settings description (behind ?) reads: the local LLM extracts important
search concepts and can re-rank results that match more of those concepts. Keyword floors are
**not** the same numbers as the grid hide-thresholds.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Re-ranking runs only when Experimental - Advanced search is on, query analysis returned at least one keyword, and at least one keyword threshold is &gt; 0. | Avoids a second embedding pass that cannot change order. | `semantic-search-handlers.ts` |
| BR-2 | Translate to English or the experimental setting can trigger query analysis; only the experimental setting plus BR-1 causes re-ranking. | Translation must not silently reorder. | `use-semantic-handlers.ts`; `semantic-search-handlers.ts` |
| BR-3 | Each keyword is embedded as a query and compared to cached visual and description vectors. A modality counts only if its threshold is &gt; 0 and cosine ≥ that floor. | User can disable one limb by setting it to 0. | `keyword-reranker.ts` |
| BR-4 | In hybrid matching, a keyword is a hit if **either** active modality passes; VLM-only / Description-only use that limb alone. | Aligns hits with Matching method. | `keyword-reranker.ts` |
| BR-5 | Sort is more keyword hits first, then higher fused score. The fused score is not multiplied. | Hits are a discrete preference; ties stay in RRF order. | `compareKeywordRerankRows` |
| BR-6 | Photos with neither cached vector keep their fused score and get zero hits. | Missing embeddings must not be invented. | `keyword-reranker.ts` |
| BR-7 | Matching method defaults to hybrid and is ignored for ranking/gating unless the experimental setting is on. | Everyday search stays hybrid. | `semantic-search.ts`; `SemanticSearchPanel.tsx` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| Experimental - Advanced search | Off | Allows keyword re-ranking and shows Matching method | Yes |
| Keyword match threshold - VLM | `0.05` | Minimum cosine for a visual keyword hit; **0** ignores VLM hits | Yes |
| Keyword match threshold - AI Description | `0.5` | Minimum cosine for a caption keyword hit; **0** ignores description hits | Yes |

`DEFAULT_AI_IMAGE_SEARCH_SETTINGS` in `apps/desktop-media/src/shared/ipc.ts`. Query analysis uses
**AI model to translate search prompt to English** (default `qwen2.5vl:3b`), with Ollama fallback
resolution in `query-understanding.ts`.

## 9. Data & persistence

The experimental flag and keyword thresholds persist in app settings. Matching method is session
state (default hybrid). Keyword hit counts are not stored on the photo.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Ollama + analysis model | Keywords (and optional English query) | Fused order; search still works |
| Cached visual / description embeddings from the first-round search | Measuring hits | Zero hits for photos that were not in those candidate lists |
| [Search indexing](02-search-indexing.md) / analysis embeddings | Anything to compare | Same as ordinary search |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `media:semantic-search-photos` | `advancedSearch`, `keywordMatchReranking`, `keywordMatchThresholdVlm`, `keywordMatchThresholdDescription`, `signalMode`, `queryAnalysisModel` | Run search with optional re-rank |
| App settings `aiImageSearch.keywordMatchReranking` | boolean | Persist the experimental toggle |

The UI sets `advancedSearch` when Translate to English **or** the experimental setting is on.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| Unit | `apps/desktop-media/electron/db/keyword-reranker.test.ts` | Hits-desc then RRF-score-desc sort |
| Unit | `apps/desktop-media/electron/db/hybrid-search.integration.test.ts` | Fusion without claiming FTS is in the rank list |
| Unit | `packages/media-store/src/slices/semantic-search.test.ts` | Default signal mode hybrid |

**Coverage gaps:** no E2E with a live Ollama keyword response; hit OR logic is described in
`keyword-reranker.ts` comments more than in tests (sort is unit-tested).

## 13. Known limitations & open questions

- **Limitation:** re-ranking only sees photos that already survived fusion (up to 100). A photo
  that would have many keyword hits but a low fused rank never gets a chance.
- **Limitation:** older product notes described an **Advanced search** checkbox in the panel;
  the shipped UI uses a Settings checkbox and **Translate to English** on the panel instead.
- **Open question:** whether keyword re-ranking should stay experimental or become a normal
  advanced option with clearer on-search copy.

## 14. References

- Module: [Search & Discovery](README.md)
- [AI image search](01-ai-image-search.md)
- Implementation history: `docs/IMPLEMENTATION-LOG/features/2026-03_phase_3_advanced_search_*.plan.md`,
  `docs/IMPLEMENTATION-LOG/features/2026-04_ai_search_keyword_settings_*.plan.md`
