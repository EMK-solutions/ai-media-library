---
id: F-05-02
module: 05-search-and-discovery
title: Search indexing
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/FolderAnalysisMenuSection.tsx
  - apps/desktop-media/electron/ipc/semantic-search-handlers.ts
  - apps/desktop-media/electron/pipelines/definitions/semantic-index.ts
  - apps/desktop-media/electron/nomic-vision-embedder.ts
related:
  - F-05-01
  - F-05-05
  - F-02-01
  - F-03-01
---

# Search indexing

> Build a visual index of a folder's photos so describing a scene can find them — the fastest AI
> job, and the one the setup path runs first.

## 1. Summary

**Index images for AI search** walks a folder (and, by default, its subfolders), makes sure each
photo has a catalog row, then computes a visual signature for every image that does not already
have one. Those signatures are what [AI image search](01-ai-image-search.md) and
[Find similar images](05-find-similar-images.md) compare against. The job is local, uses bundled
on-device models, and does not need Ollama.

This is step 3 of [J-X1](../JOURNEYS.md#j-x1--recommended-setup-path-first-library): after the
folder scan, before faces and long image analysis. A second, slower signal — matching against
AI-written titles and descriptions — needs [image analysis](../03-ai-image-analysis/01-ai-image-analysis.md)
and a **description** embedding. New analysis via the queued pipeline does not currently write
that embedding; a temporary backfill IPC exists for the gap.

## 2. User stories

- **As a new user** I want one folder action that makes search work,
  **so that** I can try "boat at sunset" the same afternoon I add photos.
- **As someone adding new files** I want a missing-only re-run,
  **so that** already indexed photos are not done again.
- **As someone watching the machine** I want progress and a way to stop,
  **so that** indexing does not lock me in.

Not for: indexing videos, or turning titles into searchable text (that is image analysis).

## 3. Scope

**In scope**

- Starting, cancelling and watching **Index images for AI search**
- Missing-only vs override-existing, include sub-folders
- What gets stored (image embeddings) and that only images are processed
- Description embeddings: when they are created today, and the temporary backfill channel

**Out of scope**

- Running a search — see [AI image search](01-ai-image-search.md)
- Writing AI titles and descriptions — see
  [AI image analysis](../03-ai-image-analysis/01-ai-image-analysis.md)
- Queue concurrency limits — [M-09 Background Processing](../09-background-processing/README.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Catalog row and metadata before each image | [Folder scan](../02-catalog-and-metadata/01-folder-scan-and-catalog/README.md) |
| Wrong-rotation pre-check during the job | [Wrong rotation detection](../03-ai-image-analysis/03-wrong-rotation-detection.md) |
| Progress dock chrome | [M-09](../09-background-processing/README.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-05-02.1 | Visual index job | Per-image visual signatures for the configured multimodal model | shipped |
| F-05-02.2 | Missing vs all | Default skips images already indexed; **Override existing** redoes them | shipped |
| F-05-02.3 | Progress and cancel | Background operations card **AI search indexing**, including model-load phase | shipped |
| F-05-02.4 | Description embedding | Text vectors from AI title+description, used as the second search signal | partial |

## 5. User journeys

### J-05-02-1 — Index a first folder (recommended early)

**Trigger:** the user opens the folder ⋮ menu or toolbar **More actions** after a scan.
**Preconditions:** a folder is selected; photos exist in that folder or its subfolders.

1. The user expands **Index images for AI search**. **Include sub-folders** is checked;
   **Override existing** is not.
2. They press Play ("Start AI search indexing").
3. Background operations shows **AI search indexing**, first **Loading vision embedding
   model…**, then per-file progress.
4. When the job finishes, they open AI image search and try two or three queries.

**Outcome:** the folder is searchable by description.

**Alternate paths**

- Include sub-folders off → only photos sitting directly in the selected folder.
- Override existing on → every image in scope is re-indexed (`all` mode).
- Job already running → starting another visual-index job is rejected until the current one
  finishes.

**Failure paths**

- Vision model warmup fails → every queued item is marked failed and the job ends; the user can
  retry after fixing models.
- Individual files fail (corrupt image, decode error) → counted as failed; others continue.
- User presses Pause / cancel → remaining items stop; completed embeddings are kept.

### J-05-02-2 — Index only what is new

**Trigger:** new photos appeared after a later folder scan.
**Preconditions:** the folder was indexed before; Override existing stays off.

1. The user starts **Index images for AI search** again.
2. Images that already have a ready visual embedding are skipped.
3. Only new (and previously failed, unless skipped internally) files are processed.

**Outcome:** search covers the new files without repeating the whole folder.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Folder analytics menu | Folder ⋮ / right-click, or toolbar More actions | Expandable **Index images for AI search**, Play/Pause, Include sub-folders, Override existing | `apps/desktop-media/src/renderer/components/FolderAnalysisMenuSection.tsx` |
| Background operations | Job start | Card title **AI search indexing**; cancel | progress dock cards under `apps/desktop-media/src/renderer/components/progress-dock/` |

**States**

| State | What the user sees |
|---|---|
| Idle | Play on the menu row; Play disabled until a folder is selected |
| Running | Spinner + Pause; submenu checkboxes disabled |
| Loading model | Phase copy **Loading vision embedding model…** |
| Completed / cancelled | Dock card can be dismissed; folder coverage updates |

**UX notes** — Play is enabled whenever a folder is selected, even if that folder has no direct
photos, because pictures may live in subfolders. The visual-index row is the first AI action in
the menu, matching the recommended order (index, then faces, then image analysis).

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Only image files are indexed, not videos. | The vision embedder consumes still images. | `semantic-index.ts`; `semantic-search-handlers.ts` |
| BR-2 | Default run mode is **missing**: skip paths that already have a ready image embedding for the current model. | Re-runs stay cheap. | `IndexFolderSemanticRequest` `mode`; menu **Override existing** maps to `all` |
| BR-3 | Include sub-folders defaults on for the menu. | Typical libraries nest event folders. | `FolderAnalysisMenuSection.tsx` |
| BR-4 | Only one visual-index job runs at a time. | GPU/ONNX warmup and embedding are a single pipeline. | `semantic-search-handlers.ts` |
| BR-5 | Before embedding, the job ensures catalog metadata for the file and may run wrong-rotation detection. | Search should see the same orientation and catalog facts as the rest of the app. | `runSemanticIndexJob` in `semantic-search-handlers.ts` |
| BR-6 | Image embeddings are stored separately from description (text) embeddings so one job cannot overwrite the other. | Vision index and caption index are independent. | `media_embeddings` via vector store; `embedding_type` `image` vs `text` |
| BR-7 | Query text is embedded with a `search_query:` prefix; stored captions use `search_document:`. | Asymmetric retrieval in the Nomic text space. | `apps/desktop-media/electron/nomic-vision-embedder.ts` |
| BR-8 | Description backfill only processes catalogued images that already have AI metadata and lack a text embedding for the current model. | Idempotent migration, not a substitute for analysis. | `media:index-description-embeddings` handler |

## 8. Settings & defaults

None — this feature exposes no Settings page controls. Per-run defaults:

| Option (UI label) | Default | Effect |
|---|---|---|
| Include sub-folders | On | Recurse under the target folder |
| Override existing | Off | `missing` vs `all` |

Models used (not user-selectable in this menu): vision `nomic-ai/nomic-embed-vision-v1.5`,
text `nomic-ai/nomic-embed-text-v1.5` (quantized ONNX). Stored rows are versioned with
`DC1LEX/nomic-embed-text-v1.5-multimodal`.

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Visual embedding (`embedding_type` image, status ready/failed) | `media_embeddings` | The photo can appear in AI search and Find similar |
| Description embedding (`embedding_type` text, source `ai_metadata`) | `media_embeddings` | The photo can rank on caption similarity |
| Folder indexed marker | folder analysis status | Coverage in folder AI summary / sidebar |

Embeddings live in the local database, survive restart, and are invalidated when catalog rules
discard AI results for a changed file.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Catalog / per-file metadata ensure | A row to hang the embedding on | Item fails ("Failed to create media item") |
| Bundled Nomic ONNX models | Warmup and embedding | Warmup failure; whole job fails |
| [M-09](../09-background-processing/README.md) | Queue and dock | Job still runs; user loses the usual progress chrome if the dock is broken |

Ollama is **not** required for visual indexing.

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `enqueueFolderAiPipeline` `pipeline: "semantic"` | `folderPath`, `recursive`, `overrideExisting` | Queue a visual index job (what the menu calls) |
| `media:index-folder-semantic-embeddings` | `folderPath`, `mode` `missing`\|`all`, `recursive`, optional `skipPreviouslyFailed` | Direct index job |
| `media:cancel-semantic-embedding-index` | optional `jobId` | Stop the running job |
| `media:semantic-index-progress` | — | Dock updates (job-started, phase-updated, item-updated, job-completed) |
| `media:index-description-embeddings` | `folderPath`, `recursive` | Temporary description-embedding backfill |
| `media:cancel-desc-embed-backfill` | `jobId` | Cancel that backfill |

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/semantic-search.spec.ts` | Builds an index with no failed items, then search works |
| E2E | `apps/desktop-media/tests/e2e/search-timing-diag.spec.ts` | Indexes the e2e folder before timing a search |
| E2E | fixtures `semantic-index-wait.ts` | Waits until the global index lock is free |

**Coverage gaps:** Override existing vs missing, cancel during warmup, and description backfill
have no dedicated UI tests.

## 13. Known limitations & open questions

- **Limitation:** the folder menu in `FolderAnalysisMenuSection.tsx` does **not** currently
  render an **AI description embedding** row, even though `media:index-description-embeddings`
  and a Background operations card still exist. Older UX docs described that row as the
  migration path.
- **Limitation:** the queued **Image AI analysis** pipeline does not write description
  embeddings (documented on
  [AI image analysis](../03-ai-image-analysis/01-ai-image-analysis.md)). Hybrid search therefore
  stays vision-heavy until that gap is closed or backfill is exposed again.
- **Limitation:** previously failed files are retried on a normal missing run; skipping them is
  an internal `skipPreviouslyFailed` flag, not a menu checkbox.
- **Open question:** whether description embedding should be chained after every successful
  analysis so users never need a separate backfill.

## 14. References

- Module: [Search & Discovery](README.md)
- [AI image search](01-ai-image-search.md), [Find similar images](05-find-similar-images.md)
- J-X1 step 3: [`../JOURNEYS.md`](../JOURNEYS.md)
- Implementation history: `docs/IMPLEMENTATION-LOG/features/2026-03_multimodal_semantic_search_*.plan.md`
