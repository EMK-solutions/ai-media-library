---
id: M-05
title: Search & Discovery
status: shipped
last_reviewed: 2026-08-26
---

# Module 05 — Search & Discovery

> Describe a photo in your own words, narrow who and where it is, and pivot from any picture to
> others that look like it.

## 1. Purpose & value

This is the fastest AI payoff in the product, and step 3 of the
[recommended setup path](../JOURNEYS.md#j-x1--recommended-setup-path-first-library). After a
folder has been catalogued, **Index images for AI search** builds a visual index so the user can
type "boat at sunset" or "birthday cake" and get ranked photos — without waiting for the slow
per-image analysis pass. Results appear in the same grid and list used for browsing, and open in
the same viewer.

A second matching signal — comparing the query with AI-written titles and descriptions — arrives
later, once [AI image analysis](../03-ai-image-analysis/README.md) has run. The two lists are
fused into one ranking. Optional people, folder, date and location filters narrow who and where
before ranking; toolbar [quick filters](../01-library-browsing-and-media-viewer/06-quick-filters.md)
narrow what is shown afterwards. From any image, **Find similar** opens a workspace of
look-alikes from the same visual index.

## 2. User stories

- **As a new user** I want to search by describing a scene as soon as the index finishes,
  **so that** I see what the product is for before committing to longer AI jobs.
- **As someone who remembers a photo but not its folder** I want to type a phrase in my own
  words, **so that** I do not have to walk the tree.
- **As a family organiser** I want to restrict a search to named people,
  **so that** "beach holiday" means the people I care about, not every beach photo.
- **As someone with near-duplicates** I want to start from one photo and see the ones that look
  like it, **so that** I can pick the best of a burst.
- **As a privacy-conscious user** I want search to run on my machine,
  **so that** nothing is uploaded to find a picture.

This module is not a filename or folder-name search, and it does not search video content.

## 3. Feature index

| ID | Feature | Status | Primary screen | Doc |
|---|---|---|---|---|
| F-05-01 | AI image search | shipped | Toolbar search → **AI image search** panel; results in the media grid / list | [01-ai-image-search.md](01-ai-image-search.md) |
| F-05-02 | Search indexing | shipped | Folder ⋮ / More actions → **Index images for AI search** | [02-search-indexing.md](02-search-indexing.md) |
| F-05-03 | Search filters & scope | shipped | Search panel (scope, people) and toolbar quick filters | [03-search-filters-and-scope.md](03-search-filters-and-scope.md) |
| F-05-04 | Keyword re-ranking | experimental | Settings → **AI image search** → **Experimental - Advanced search** | [04-keyword-reranking.md](04-keyword-reranking.md) |
| F-05-05 | Find similar images | shipped | Item ⋮ → **Find similar**; **Similar images** workspace | [05-find-similar-images.md](05-find-similar-images.md) |

## 4. Key journeys

| ID | Journey | Path through the product |
|---|---|---|
| J-05-1 | First search after setup | Folder scan → **Index images for AI search** → open AI image search → type a description → results in the grid |
| J-05-2 | Find a remembered photo | Search globally → optional people chips and Translate to English → narrow with quick filters → open a result |
| J-05-3 | Search one folder | Select folder → scope **Selected folder** or **Selected folder with sub-folders** → Search |
| J-05-4 | Pivot to look-alikes | Item ⋮ → **Find similar** → adjust similarity level → open a neighbour in the viewer |

Cross-module flows, including J-X1 step 3 and J-X2, are in [`../JOURNEYS.md`](../JOURNEYS.md).

## 5. Entry points & navigation

| Entry point | Leads to | Notes |
|---|---|---|
| Toolbar search icon (**Open AI image search**) | Search panel above the media pane | Toggles the panel; results replace the folder grid until cleared or a folder is selected |
| Folder ⋮ / toolbar **More actions** | **Index images for AI search** | Include sub-folders on by default; Override existing off |
| Item ⋮ **Find similar** | Similar images workspace | Images only; videos do not show the action |
| Settings → **AI image search** | Thresholds, translation model, experimental re-ranking | Similarity thresholds and re-ranking sit behind **Hide advanced settings** (on by default) |

Selecting a folder in the sidebar clears search results and closes the panel.

## 6. Key concepts

| Term | Meaning in this module |
|---|---|
| AI image search | Finding photos by describing them in plain language |
| Search index | Per-image visual signatures built by **Index images for AI search** |
| Description matching | Comparing the query with AI titles and descriptions (needs image analysis) |
| Hybrid search | Combining visual matching and description matching into one ranked list |
| Similarity threshold | Minimum match strength; weaker results are hidden, not shown as poor matches |
| Search scope | Whole library, selected folder, or selected folder and everything beneath it |
| Find similar | Starting from one photo and listing images that look most like it |
| Unconfirmed face | A suggested person match the user has not confirmed; search can include these |

Full definitions: [`../GLOSSARY.md`](../GLOSSARY.md).

## 7. Dependencies

**Depends on**

| Module | What it needs |
|---|---|
| [M-02 Catalog & Metadata](../02-catalog-and-metadata/README.md) | Catalog rows and dates/places used as search constraints |
| [M-01 Library Browsing & Media Viewer](../01-library-browsing-and-media-viewer/README.md) | Grid, list, viewer, item menu, and quick filters as the result surface |
| [M-03 AI Image Analysis](../03-ai-image-analysis/README.md) | Titles and descriptions for the second matching signal |
| [M-04 People & Faces](../04-people-and-faces/README.md) | Person tags and unconfirmed-face suggestions as search filters |
| [M-09 Background Processing](../09-background-processing/README.md) | Queue, progress and cancel for indexing |
| [M-11 Settings & Configuration](../11-settings-and-configuration/README.md) | Search thresholds, translation model, experimental re-ranking |
| [M-13 Platform & Distribution](../13-platform-and-distribution/README.md) | On-device vision/text embedding models; Ollama only for optional query translation |

**Depended on by**

| Module | What it consumes |
|---|---|
| [M-01 Library Browsing & Media Viewer](../01-library-browsing-and-media-viewer/README.md) | Search results and Find similar as sources for the viewer |
| [M-08 Insights & Library Health](../08-insights-and-library-health/README.md) | Folder coverage for the search-index pipeline |
| [M-12 Onboarding & Help](../12-onboarding-and-help/README.md) | Guided copy that points at English prompts and indexing |

## 8. Settings owned

| Settings group (UI label) | Features affected |
|---|---|
| **AI image search** — translation model, visual and description hide-thresholds, Experimental - Advanced search and its keyword floors | F-05-01, F-05-03, F-05-04 |

Indexing itself has no settings of its own; **Include sub-folders** and **Override existing** are per-run menu options.

## 9. Quality snapshot

| Type | Coverage |
|---|---|
| E2E | `apps/desktop-media/tests/e2e/semantic-search.spec.ts` — index a folder, ranked prompts, results in the grid, hide-all-results thresholds |
| E2E | `apps/desktop-media/tests/e2e/search-timing-diag.spec.ts` — click-to-render timing of a search |
| E2E | `apps/desktop-media/tests/e2e/unconfirmed-face-search.spec.ts` — person-tag filter expands when unconfirmed faces are included |
| E2E | `apps/desktop-media/tests/e2e/quick-filters.spec.ts` — quick filters apply to search results |
| Unit | `apps/desktop-media/electron/db/search-fusion.test.ts`, `keyword-reranker.test.ts`, `hybrid-search.integration.test.ts`, `ai-search-similarity-gate.test.ts`, `similar-images-actions.test.ts`, `packages/media-store/src/slices/semantic-search.test.ts` |

**Gaps:** no dedicated E2E for Find similar, for folder vs global scope radios, or for keyword re-ranking with Ollama. Description-embedding backfill has IPC coverage in handlers but no UI test.

## 10. Known gaps & direction

- Visual indexing is enough for a first search; description matching stays weaker until image analysis (and a description embedding) exists for each photo. The queued analysis pipeline does not currently write that embedding — see F-05-02.
- Full-text keyword search over AI captions runs in parallel for diagnostics and is **not** mixed into the ranked list.
- Search scans stored embeddings rather than an approximate index; large libraries are slower.
- Videos are not indexed or searchable by content.
- Keyword re-ranking is experimental, off by default, and needs a local Ollama model.
