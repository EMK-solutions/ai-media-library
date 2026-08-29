---
id: F-03-01
module: 03-ai-image-analysis
title: AI image analysis
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/electron/pipelines/definitions/photo-analysis.ts
  - apps/desktop-media/electron/photo-analysis.ts
  - apps/desktop-media/electron/db/media-analysis.ts
  - apps/desktop-media/src/renderer/hooks/use-photo-analysis-handlers.ts
  - packages/media-store/src/slices/ai-analysis.ts
related:
  - F-03-02
  - F-03-03
  - F-03-04
  - F-03-05
---

# AI image analysis

> Run a local vision model over a folder so every image gets a title, a description, a category
> and a quality assessment that the rest of the app can use.

## 1. Summary

AI image analysis is the pipeline that gives the library words. The user picks a folder, starts
the job from the folder menu, and the app sends each image in turn to a vision model running
locally through Ollama. For every image the model returns a short title, a detailed description,
one image category, an estimate of how many people are present, an approximate place, date and
time, weather and time of day, a photographic quality score, a list of quality problems, and a
set of suggested edits.

It is the slowest thing the product does — seconds to a minute per image — so it is designed to
be started deliberately and left running: the job survives navigation, reports progress in the
Background operations dock, and can be cancelled at any point without losing images that were
already finished. Because results are stored per image, a second run over the same folder can
skip everything that already succeeded.

## 2. User stories

- **As a photo owner** I want every image described in plain language, **so that** I can find
  photos later by what they show.
- **As someone with a large archive** I want to analyse one folder at a time and see how far it
  has got, **so that** I can spread a long job over several sessions.
- **As a user adding new photos** I want a re-run to process only the new files, **so that** I
  do not pay for the same work twice.
- **As someone whose machine is needed for other work** I want to stop a run immediately,
  **so that** analysis never blocks me.

This is not a bulk photo editor: the analysis writes descriptions and suggestions, it does not
change image files.

## 3. Scope

**In scope**

- Starting, cancelling and re-running analysis for a folder, optionally including sub-folders
- Choosing between analysing only unprocessed images and re-analysing everything
- Model warm-up before the batch, and progress and time-left reporting during it
- Storing title, description, category, people count, place, date, quality and suggestions
- Failure handling and retry behaviour per image

**Out of scope**

- The wording of the prompt and the choice of model — see
  [Analysis prompts & models](02-analysis-prompts-and-models.md)
- Deciding whether an image is stored the wrong way up — see
  [Wrong rotation detection](03-wrong-rotation-detection.md)
- Reading invoice fields — see
  [Invoice & receipt extraction](05-invoice-and-receipt-extraction.md)
- Presenting suggestions — see [Image edit suggestions](04-image-edit-suggestions.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Queue order, concurrency limits and the progress dock | [Background processing](../09-background-processing/README.md) |
| Coverage percentages and lists of failed images | [Insights & Library Health](../08-insights-and-library-health/README.md) |
| Discarding results when a file changes | [Catalog & metadata](../02-catalog-and-metadata/README.md) |
| Showing descriptions and quality in the viewer | [Photo info panel](../01-library-browsing-and-media-viewer/04-photo-info-panel.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-03-01.1 | Folder analysis run | Start analysis for a folder, with or without its sub-folders | shipped |
| F-03-01.2 | Missing-only vs re-analyse all | **Override existing** decides whether finished images are processed again | shipped |
| F-03-01.3 | Model warm-up phase | A first "loading the model" phase so the first images do not fail on a cold model | shipped |
| F-03-01.4 | Live progress and time left | Processed / total, analysed, skipped, failed and cancelled counts plus an estimate | shipped |
| F-03-01.5 | Cancellation | Stop the run; already-finished images keep their results | shipped |
| F-03-01.6 | Per-image failure recording | A failed image records why, is shown in the folder summary, and is retried last on the next run | shipped |
| F-03-01.7 | Written-back results | Description, category, quality, people count and place become visible in the info panel and filters | shipped |

## 5. User journeys

### J-03-01-1 — Analyse a folder for the first time

**Trigger:** the user opens the folder's ⋮ menu and expands **Image AI analysis**.
**Preconditions:** the folder has been scanned into the catalog, and Ollama is running with the
selected vision model installed.

1. The user leaves **Include sub-folders** checked (the default) and **Override existing**
   unchecked (the default), then presses the start control.
2. The Background operations dock expands and shows a *Local AI analysis* card labelled
   **1/2**, while Ollama loads the model.
3. The card switches to **2/2** and starts counting images, showing processed / total, how many
   were analysed, and an estimated time left.
4. The user keeps browsing; the job continues in the background.
5. When the run finishes, opening any image in that folder shows a Category, Title and
   Description in the info panel's **AI image analysis** section, and an aesthetic score and star
   equivalent under **AI quality analysis and improvements**.

**Outcome:** the folder is described, and its images now respond to the category and AI rating
quick filters, to description-based search, and — for bills — to the Documents workspace.

**Alternate paths**

- The user unchecks **Include sub-folders** → only images directly in that folder are processed.
- The same folder already has a job queued or running → the second request is ignored rather
  than queued twice.
- The user starts analysis from the Folder AI analysis summary instead → the run always includes
  sub-folders.

**Failure paths**

- Ollama is not reachable, or the selected model is not installed → the run fails and the card
  shows the reason; the folder menu returns to a startable state.
- A single image cannot be analysed → it is counted under **Failed**, the reason is stored
  against that image, and the run continues with the next one.

### J-03-01-2 — Analyse only the images added since last time

**Trigger:** the user has added new files to an already-analysed folder and re-run the folder
scan.

1. The user starts **Image AI analysis** again with **Override existing** unchecked.
2. Images that already have a successful analysis are counted as **Skipped** and never sent to
   the model.
3. Images that previously failed are included, but placed at the end of the queue so the new
   ones are done first.

**Outcome:** only genuinely new or previously unsuccessful work is paid for.

**Alternate paths**

- The user checks **Override existing** → every image in scope is analysed again, replacing the
  previous result.

### J-03-01-3 — Stop a long run

**Trigger:** the user presses the cancel control on the *Local AI analysis* card, or the pause
control in the folder menu.

1. The run stops after the image currently in flight.
2. Remaining images are reported as cancelled and left untouched.
3. The menu control returns to its start state, and the folder can be re-run later.

**Outcome:** the machine is free again, and no partial result was written.

**Alternate paths**

- Cancel is pressed while the model is still loading → the run ends without any image being
  marked failed.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Folder analysis menu section | Folder row ⋮ / right-click, or toolbar **More actions** | **Image AI analysis** row with a start/pause control, plus **Include sub-folders** and **Override existing** checkboxes | `apps/desktop-media/src/renderer/components/FolderAnalysisMenuSection.tsx` |
| Local AI analysis card | Background operations dock, opened automatically when a run starts | Phase prefix, folder name, progress bar, counts, time left, cancel control | `apps/desktop-media/src/renderer/components/progress-dock/cards/AnalysisCard.tsx` |
| AI sections of the info panel | Open an image in the viewer → Info tab | **AI image analysis** (category, title, description, people detected, has child or children) and **AI quality analysis and improvements** (aesthetic quality 1–10, AI star rating 1–5, low quality, quality issues, edit suggestions) | `apps/desktop-media/src/renderer/components/DesktopViewerInfoPanel.tsx` |

**States**

| State | What the user sees |
|---|---|
| Not started | The info panel's AI section reads "Run AI analysis to populate this section." |
| Loading the model | Card title prefixed **1/2**; the app also carries the message "Loading AI model - it may take 1-2min" |
| Analysing | Card title prefixed **2/2**, with per-image progress and a time-left estimate |
| Cancelled | Remaining images counted as cancelled; the card can be dismissed |
| Failed | The card shows the error text, for example that Ollama could not be reached |

**UX notes**

- The dock is expanded automatically when a run is enqueued, so the user sees that something
  started without having to look for it.
- Counts are broken down as processed / total, analysed, skipped, failed and cancelled; skipped,
  failed and cancelled only appear once they are non-zero.
- Cancelling and dismissing share one control: while running it cancels, afterwards it closes
  the card.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Only image files are analysed; videos in the folder are ignored. | The prompt and the model expect a still frame. | `apps/desktop-media/electron/pipelines/definitions/photo-analysis.ts` |
| BR-2 | With **Override existing** off, an image is skipped when it has a successful analysis that is newer than any recorded failure and its stored metadata actually contains a category, title and description. | A half-written result should not count as done. | `apps/desktop-media/electron/db/media-analysis.ts` |
| BR-3 | Images that previously failed are queued after images that have never been analysed. | New work should not wait behind repeat failures. | `apps/desktop-media/electron/ipc/pipeline-item-order.ts` |
| BR-4 | Before the batch, the app checks that the selected model is actually installed in Ollama, then warms it up, retrying with backoff for up to 90 seconds; no image is marked failed during this phase. | A missing model should fail in one second, not after a hundred timeouts, and a cold model used to fail the first images of every run. | `apps/desktop-media/electron/ollama-model-resolve.ts`, `apps/desktop-media/electron/photo-analysis.ts` |
| BR-5 | Each image is checked for wrong rotation immediately before it is sent to the model, unless that check is switched off. | Downstream results are better when orientation is already known. | `apps/desktop-media/electron/pipelines/definitions/photo-analysis.ts` |
| BR-6 | A single image that takes longer than the per-image timeout (default 120 seconds) is abandoned and recorded as timed out. | One pathological image must not stall a folder. | `apps/desktop-media/electron/photo-analysis.ts` |
| BR-7 | Transient model errors — unreachable service, HTTP 5xx, truncated responses — are retried up to three times per image before it counts as failed. | Local model daemons drop occasional requests. | `apps/desktop-media/electron/photo-analysis.ts` |
| BR-8 | When downscaling is on (the default), an image whose longest side exceeds the configured limit is resized to that limit as JPEG before being sent; if it cannot be decoded, the original file is sent unchanged. | Very large photos overwhelm the local model or slow it down. | `apps/desktop-media/electron/photo-analysis.ts` |
| BR-9 | A response that is not valid JSON, or that lacks a category, title or description, fails that image. | Partial results would pollute filters and search. | `apps/desktop-media/electron/photo-analysis-parser.ts` |
| BR-10 | Rotation suggestions returned by the model are discarded before the result is stored. | Orientation is decided by the dedicated check, not by the vision model. | `apps/desktop-media/electron/pipelines/definitions/photo-analysis.ts` |
| BR-11 | A successful analysis clears the previous failure marker for that image. | The folder summary must reflect the latest attempt. | `apps/desktop-media/electron/db/media-analysis.ts` |
| BR-12 | The place the model guesses never overwrites a place that came from GPS, embedded metadata or the file path. | Measured location beats an inferred one. | `apps/desktop-media/electron/db/media-analysis.ts` |
| BR-13 | Stored titles and descriptions are added to the keyword search index; if that write fails the analysis result is still kept. | Search should improve, but never block analysis. | `apps/desktop-media/electron/db/media-analysis.ts` |
| BR-14 | Analysis jobs share a single-slot resource group by default, so only one runs at a time. | The local model server handles one heavy request well. | `apps/desktop-media/src/shared/pipeline-types.ts` |
| BR-15 | Starting analysis for a folder that already has an active job is silently ignored. | Prevents accidental double runs from two menus. | `apps/desktop-media/src/renderer/lib/enqueue-folder-ai-pipeline.ts` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| Image analysis pending — folder icon | Amber (moderate) | Tint of a folder icon when everything except image analysis is complete | No |
| Extract invoice data | On | Runs the second, invoice-specific pass on bills — see [F-03-05](05-invoice-and-receipt-extraction.md) | No |
| AI model | `qwen3.5:9b` | Which Ollama vision model analyses the images | Yes |
| Analysis timed out per image (seconds) | 120 | How long one image may take before it is failed | Yes |
| Downscale image dimensions before passing to LLM | On | Shrinks large images before sending them | Yes |
| Maximum length of the longest side (pixels) | 1024 | The size images are shrunk to | Yes |

Defined in `apps/desktop-media/src/shared/ipc.ts` (`DEFAULT_PHOTO_ANALYSIS_SETTINGS`) and shown
in Settings → **AI image analysis**. Run-scope choices — **Include sub-folders** (on) and
**Override existing** (off) — are per-run controls in the folder menu, not persisted settings.

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Title, description, category, quality score, quality issues, edit suggestions | `media_items.ai_metadata` | The AI sections of the info panel; category and AI rating quick filters |
| Analysis completion timestamp | `media_items.photo_analysis_processed_at` | Counts towards the folder's AI photo analysis coverage |
| Failure time and message | `media_items.photo_analysis_failed_at`, `media_items.photo_analysis_error` | The failed list in the folder analysis summary |
| People count and age range | `media_items.people_detected`, `age_min`, `age_max` | The people quick filter and info panel |
| Guessed country and city | `media_items.city`, `country`, `location_name` | Place shown in the info panel, unless a stronger source already set it |
| Searchable title and description | Keyword search index | Text matches in AI image search |

Results survive restarts and live in the local database next to the catalog. They are discarded
when [catalog scanning](../02-catalog-and-metadata/README.md) decides a file changed in a way
that invalidates them, which puts the image back into the "missing" set for the next run.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Ollama running locally with the selected model pulled | Every image | The run stops before the first image with either "Cannot reach Ollama to verify model …" or a message naming the missing model and listing what is installed |
| A catalog row per image | Writing results | Missing rows are created for the images in scope before the batch starts |
| [Wrong rotation detection](03-wrong-rotation-detection.md) | The pre-check before each image | Analysis continues; only the rotation finding is missing |
| Enough memory on the machine | Large images | Downscaling is on by default specifically to avoid this failure |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `enqueueFolderAiPipeline` with `pipeline: "photo"` | `folderPath`, `recursive`, `overrideExisting`, `photoModel`, `photoThinkingEnabled`, `photoSettings` | Queue an analysis job for a folder |
| Pipeline `photo-analysis` | `folderPath`, `recursive`, `mode` (`missing` \| `all`), `skipPreviouslyFailed`, `model`, `think`, `timeoutMsPerImage`, `extractInvoiceData`, `downscaleBeforeLlm`, `downscaleLongestSidePx` | The queued job itself |
| `media:cancel-photo-analysis` | `jobId` | Stop a running job |
| `media:photo-analysis-progress` | — | Progress events consumed by the dock |

Store state for the UI (`aiStatus`, `aiPhase`, `aiItemsByKey`, `aiError`) lives in
`packages/media-store/src/slices/ai-analysis.ts`.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/analysis-trigger.spec.ts` | The analysis option is offered for a selected folder and starting it keeps the app alive |
| E2E | `apps/desktop-media/tests/e2e/photo-analysis-cancel.spec.ts` | Cancelling straight away leaves browsing usable and no run stuck in progress |
| E2E | `apps/desktop-media/tests/e2e/photo-analysis-warmup-cancel.spec.ts` | Cancelling during model loading resets the menu to a startable state |
| E2E | `apps/desktop-media/tests/e2e/photo-analysis-readiness.spec.ts` | Images are not marked failed while the model warms up, and processing then succeeds |
| E2E | `apps/desktop-media/tests/e2e/photo-analysis-downscale-settings.spec.ts` | Shipped downscale defaults, and the request changing when the setting is turned off |
| Unit | `apps/desktop-media/electron/photo-analysis-llm-dimensions.test.ts` | Downscale sizing for landscape, portrait and square images, and the no-op case |
| Unit | `apps/desktop-media/electron/db/media-analysis.test.ts` | Location parsing and storage, GPS precedence, and treating a newer failure as the current state |

**Coverage gaps:** there is no automated test of the response parser, of the missing-versus-all
selection logic, or of the per-image timeout and retry behaviour.

## 13. Known limitations & open questions

- **Limitation:** analysis is per folder and manual. There is no library-wide run and no
  automatic follow-up after a scan discovers new files.
- **Limitation:** the queued pipeline does not create the description embedding that AI search
  uses for description matching. Until that gap closes, description matching depends on the
  separate **AI description embedding** action in the folder menu, owned by
  [Search & Discovery](../05-search-and-discovery/README.md).
- **Limitation:** the model id in Settings is a free-text field that is not checked while the
  user types it. A wrong id is only reported when a run starts, and the settings help text says
  so explicitly.
- **Limitation:** "thinking" mode is supported for models that offer it, but the app ships with
  it off and exposes no control to turn it on.
- **Open question:** the setting for a two-pass orientation consistency check still exists and
  still defaults to on, but the shipped pipeline never uses it and no screen exposes it. It
  should either be wired up or retired.

## 14. References

- Module: [AI Image Analysis](README.md)
- [Analysis prompts & models](02-analysis-prompts-and-models.md) — what is asked and by which model
- [Wrong rotation detection](03-wrong-rotation-detection.md) — the pre-check that runs first
- [Invoice & receipt extraction](05-invoice-and-receipt-extraction.md) — the second pass on bills
- Recommended setup order: [`../JOURNEYS.md`](../JOURNEYS.md) step 5 of J-X1
- Implementation history: `docs/IMPLEMENTATION-LOG/bugs/2026-03_photo_ai_warmup_cancel_*.plan.md`,
  `docs/IMPLEMENTATION-LOG/bugs/2026-03_fix_image_ai_analysis_readiness_*.plan.md`
