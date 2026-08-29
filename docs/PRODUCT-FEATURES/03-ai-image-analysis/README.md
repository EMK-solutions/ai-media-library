---
id: M-03
title: AI Image Analysis
status: shipped
last_reviewed: 2026-08-26
---

# Module 03 — AI Image Analysis

> Let a local vision model look at every image and write down what it shows, how good it is,
> which way up it belongs, and — for photographed paperwork — what the numbers on it are.

## 1. Purpose & value

This module is where the library stops being a list of filenames and starts describing itself.
A local vision model, served by Ollama on the user's own machine, looks at each image and
writes a short title, a detailed description, an image category, a photographic quality
assessment, a list of quality problems, and concrete edit suggestions. When an image turns out
to be an invoice or a receipt, a second pass reads the issuer, date, totals and VAT off the
paper. Alongside that, a small dedicated classifier decides whether an image is stored sideways
or upside down, so the rest of the product — and the user — sees photos the right way up.

Everything else in the product gets better once this has run. Descriptions appear in the viewer
info panel and become a second matching signal for search; categories power the quick filters
and the smart album exclusion list; quality scores drive the AI rating filter; invoice fields
fill the Documents workspace. The trade-off is time: this is by far the slowest pipeline in the
product, taking seconds to a minute per image, which is why the recommended setup path in
[`../JOURNEYS.md`](../JOURNEYS.md) (step 5 of J-X1) puts it last.

## 2. User stories

- **As a photo owner** I want each photo described in words, **so that** I can find it later by
  what is in it rather than by where I filed it.
- **As someone triaging a shoot** I want the app to tell me which frames are blurred, badly
  exposed or poorly framed, **so that** I can skip the ones that are not worth keeping.
- **As a browsing user** I want photos labelled by kind — nature, people, screenshot, document —
  **so that** I can filter a mixed folder down to what I am looking for.
- **As someone with scanned paperwork in my photo folders** I want invoices and receipts
  recognised and their totals read, **so that** I can find a purchase without opening every file.
- **As an archivist** I want sideways scans and phone photos flagged, **so that** I can fix
  orientation in one review pass instead of file by file.

## 3. Feature index

| ID | Feature | Status | Primary screen | Doc |
|---|---|---|---|---|
| F-03-01 | AI image analysis | shipped | Folder ⋮ menu → Image AI analysis; Background operations | [01-ai-image-analysis.md](01-ai-image-analysis.md) |
| F-03-02 | Analysis prompts & models | shipped | Settings → AI image analysis | [02-analysis-prompts-and-models.md](02-analysis-prompts-and-models.md) |
| F-03-03 | Wrong rotation detection | shipped | Settings → Wrong image rotation detection; Folder AI analysis summary | [03-wrong-rotation-detection.md](03-wrong-rotation-detection.md) |
| F-03-04 | Image edit suggestions | shipped | Toolbar ⋮ → Image edit suggestions | [04-image-edit-suggestions.md](04-image-edit-suggestions.md) |
| F-03-05 | Invoice & receipt extraction | shipped | Settings → AI image analysis → Extract invoice data | [05-invoice-and-receipt-extraction.md](05-invoice-and-receipt-extraction.md) |

## 4. Key journeys

| ID | Journey | Path through the product |
|---|---|---|
| J-03-1 | Describe a folder | Select folder → ⋮ → Image AI analysis → Start → watch Background operations → descriptions appear in the info panel |
| J-03-2 | Analyse only what is new | Re-run on the same folder with **Override existing** left unchecked → already-analysed images are skipped |
| J-03-3 | Re-analyse with a different model | Settings → AI image analysis → AI model → re-run with **Override existing** checked |
| J-03-4 | Review what the model suggests improving | Select folder → toolbar ⋮ → Image edit suggestions → compare original against preview |
| J-03-5 | Find sideways images | Run analysis (rotation check runs first) → Folder AI analysis summary → **Wrongly rotated images** → review screen |
| J-03-6 | Turn photographed bills into a table | Keep **Extract invoice data** on → run analysis → Documents → Invoices & Receipts |

Cross-module flows, including where this module sits in the recommended setup order, are in
[`../JOURNEYS.md`](../JOURNEYS.md).

## 5. Entry points & navigation

| Entry point | Leads to | Notes |
|---|---|---|
| Folder row ⋮ or right-click → **Image AI analysis** | Starts or cancels a folder analysis job | Sub-rows for **Include sub-folders** (on by default) and **Override existing** (off by default) |
| Toolbar **More actions** (⋮) → **Image AI analysis** | Same controls for the selected folder | Same menu section as face detection and search indexing |
| Toolbar **More actions** (⋮) → **Image edit suggestions** | Full-pane list of suggested improvements for the current folder | Replaces the media grid until closed |
| **Background operations** dock → *Local AI analysis* card | Live progress, time left, cancel | Two phases: model loading, then analysing |
| Folder AI analysis summary → **AI Image analysis** card | Coverage per folder, plus a run action | Owned by [M-08](../08-insights-and-library-health/README.md) |
| Folder AI analysis summary → **Wrongly rotated images** card | Coverage, the wrongly rotated count and the review screen | Owned by [M-08](../08-insights-and-library-health/README.md) |
| Settings → **AI image analysis** / **Wrong image rotation detection** | Model, timeout, downscaling, invoice extraction, rotation thresholds | Several controls only appear when advanced settings are shown |

## 6. Key concepts

| Term | Meaning in this module |
|---|---|
| AI image analysis | One pass of the local vision model over an image, producing title, description, category, quality and edit suggestions |
| Image category | The single kind the model assigns to an image, from a fixed list including documents, invoices, screenshots, nature and people |
| AI quality / AI rating | The model's 1–10 photographic quality score, shown to the user as a 1–5 star equivalent |
| Quality issues | Named problems the model reports, such as blur, motion blur, over- or under-exposure |
| Edit suggestions | Machine-readable improvement proposals (crop, straighten, exposure, contrast, white balance, denoise, sharpen) |
| Rotation detection | The separate check that decides whether a stored image needs a quarter-turn to appear upright |
| Invoice data | The structured issuer, number, date, client number, total, currency and VAT fields read from a photographed bill |
| Model warm-up | The first phase of a run, where Ollama loads the vision model before any image is sent |

Full definitions: [`../GLOSSARY.md`](../GLOSSARY.md).

## 7. Dependencies

**Depends on**

| Module | What it needs |
|---|---|
| [M-02 Catalog & Metadata](../02-catalog-and-metadata/README.md) | A catalog row per image; analysis results are written onto it and are discarded when a file change invalidates them |
| [M-09 Background Processing](../09-background-processing/README.md) | The job queue, concurrency limits, progress reporting and cancellation |
| [M-11 Settings & Configuration](../11-settings-and-configuration/README.md) | Model choice, per-image timeout, downscaling, invoice extraction, rotation thresholds |
| [M-13 Platform & Distribution](../13-platform-and-distribution/README.md) | A running Ollama service with the chosen vision model pulled, and the downloaded orientation model |
| [M-04 People & Faces](../04-people-and-faces/README.md) | Face landmarks, used as the fallback signal when the orientation classifier cannot decide |

**Depended on by**

| Module | What it consumes |
|---|---|
| [M-01 Library Browsing & Media Viewer](../01-library-browsing-and-media-viewer/README.md) | Title, description, category, quality and invoice fields in the info panel; categories and AI rating in quick filters |
| [M-05 Search & Discovery](../05-search-and-discovery/README.md) | AI titles and descriptions as a keyword and description-vector search signal |
| [M-06 Albums](../06-albums/README.md) | Image categories used by the smart album exclusion list |
| [M-07 Documents](../07-documents/README.md) | The invoice-or-receipt category and the extracted invoice fields |
| [M-08 Insights & Library Health](../08-insights-and-library-health/README.md) | Per-folder analysis coverage, failure lists, and the wrongly rotated images review |

## 8. Settings owned

| Settings group (UI label) | Features affected |
|---|---|
| **AI image analysis** — image-analysis-pending folder icon tint, Extract invoice data, AI model, Analysis timed out per image, downscale before the model and its longest side, read-only prompts | F-03-01, F-03-02, F-03-05 |
| **Wrong image rotation detection** (advanced) — run the check before other AI pipelines, face-landmark fallback, minimum confidence for review | F-03-03 |

Defaults for every one of these are listed in the feature documents; the settings screen itself
is described in [M-11](../11-settings-and-configuration/README.md).

## 9. Quality snapshot

| Type | Coverage |
|---|---|
| E2E | `apps/desktop-media/tests/e2e/analysis-trigger.spec.ts` — the analysis option appears when a folder is selected and starting it does not crash the app |
| E2E | `apps/desktop-media/tests/e2e/photo-analysis-cancel.spec.ts` — cancelling immediately leaves folder browsing usable and no analysis stuck in progress |
| E2E | `apps/desktop-media/tests/e2e/photo-analysis-warmup-cancel.spec.ts` — cancelling during model loading resets the menu back to a startable state |
| E2E | `apps/desktop-media/tests/e2e/photo-analysis-readiness.spec.ts` — no image is marked failed while the model is still warming up |
| E2E | `apps/desktop-media/tests/e2e/photo-analysis-downscale-settings.spec.ts` — shipped downscale defaults, and the request reflecting the setting after it is turned off |
| E2E | `apps/desktop-media/tests/e2e/image-edit-suggestions-view.spec.ts` — a stored rotation finding survives a later analysis run overwriting the same item |
| Unit | `apps/desktop-media/electron/photo-analysis-llm-dimensions.test.ts`, `apps/desktop-media/electron/orientation-preprocess.test.ts`, `apps/desktop-media/electron/db/media-analysis.test.ts`, `apps/desktop-media/electron/db/rotation-review-geometry.test.ts`, `apps/desktop-media/electron/jpeg-exif-orientation.test.ts`, `apps/desktop-media/electron/db/folder-ai-wrongly-rotated-images.test.ts` |

**Gaps:** the prompt response parser, the merging of analysis results into existing metadata and
the invoice extraction pass have no dedicated automated tests; nothing exercises a real model
end to end, because every automated run stubs Ollama.

## 10. Known gaps & direction

- Analysis is folder-scoped and manual. There is no library-wide "analyse everything" action and
  no automatic follow-up run after a folder scan finds new files.
- The model id in Settings is free text and is not validated while it is typed; a wrong id is
  only reported when a run starts and checks Ollama.
- Edit suggestions are read-only. The app can preview a crop or rotation but only rotation can
  actually be applied, and only from the review screen owned by
  [M-08](../08-insights-and-library-health/README.md).
- Analysis writes AI titles and descriptions but does not, in the queued pipeline, create the
  description embedding that search uses; that is a separate action today. See
  [AI image analysis](01-ai-image-analysis.md) §13.
- Video files are not analysed at all; only images are sent to the model.
