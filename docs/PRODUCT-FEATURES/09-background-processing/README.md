---
id: M-09
title: Background Processing
status: shipped
last_reviewed: 2026-08-26
---

# Module 09 — Background Processing

> Queue long-running scans and AI jobs, watch them in Background operations, cancel them, and
> keep the machine usable with concurrency limits — so the library stays browsable while work
> runs.

## 1. Purpose & value

Every pipeline in the product can take longer than a click: folder scan, search indexing, face
detection, image analysis, duplicate checks, geocoding. This module is the shared way those jobs
are started, ordered, shown and stopped. The user enqueues work from a folder or from Insights,
keeps browsing, and reads progress in the collapsible **Background operations** dock at the
bottom of the window.

Jobs are grouped into **bundles**. Jobs inside a bundle run one after another (scan then
geocode, for example). Bundles wait in FIFO order, but two bundles may run at the same time when
they need different resources — disk versus the vision model. Image analysis is the slowest
pipeline; the recommended setup path therefore queues it last so search and faces become useful
first ([JOURNEYS.md](../JOURNEYS.md) J-X1).

The shared Zustand **Bottom panel** slice exists in the store for historical / web reuse. The
desktop app does **not** render it. The dock is the user-facing panel.

## 2. User stories

- **As someone starting several folders** I want jobs to wait their turn, **so that** I can
  enqueue a tree and walk away.
- **As a browsing user** I want to see what is running and how long is left, **so that** I know
  the machine is working.
- **As someone who started the wrong folder** I want to cancel, **so that** I do not wait for
  work I no longer want.
- **As a user on a modest PC** I want heavy AI to stay serial by default, **so that** the
  desktop stays responsive.

## 3. Feature index

| ID | Feature | Status | Primary screen | Doc |
|---|---|---|---|---|
| F-09-01 | Pipeline queue & orchestration | shipped | Enqueue from folder/Insights; dock queue | [01-pipeline-queue.md](01-pipeline-queue.md) |
| F-09-02 | Progress dock | shipped | Bottom **Background operations** | [02-progress-dock.md](02-progress-dock.md) |
| F-09-03 | Cancellation & ETA | shipped | Card **X**; **Time left** | [03-cancellation-and-eta.md](03-cancellation-and-eta.md) |
| F-09-04 | Concurrency limits | shipped | Settings → Pipeline concurrency | [04-concurrency-limits.md](04-concurrency-limits.md) |

## 4. Key journeys

| ID | Journey | Path through the product |
|---|---|---|
| J-09-1 | Enqueue and browse | Start a pipeline → dock expands → switch folders; the job continues |
| J-09-2 | Several folders | Enqueue folder A then B → B sits under **Queued** until capacity allows |
| J-09-3 | Stop work | **X** on a running card → job cancels; completed **X** only hides the card |
| J-09-4 | Pace the machine | Settings → raise or lower GPU / Ollama / CPU / I/O limits (defaults 1 / 1 / 2 / 2) |

Onboarding: after a folder scan, further pipelines should be **queued** rather than blocking the
UI, and **image analysis should be last** because it is slowest. See J-X1 steps 2–5.

## 5. Entry points & navigation

| Entry point | Leads to | Notes |
|---|---|---|
| Folder row / dashboard Play | A bundle in the queue | User-facing names include the folder path |
| Insights duplicate / rotation flows | Scan or review jobs | Same dock |
| Dock header | Collapse / expand | Spinner in the title while anything is running |
| **Run pipelines** | Test-only sheet | Shown when `EMK_E2E_RUN_PIPELINES_UI` is set; not production chrome |
| Settings → **Pipeline concurrency (advanced)** | Group limits | Hidden when advanced settings are hidden |

The dock is hidden while the photo/video viewer is open; jobs keep running.

## 6. Key concepts

| Term | Meaning in this module |
|---|---|
| Pipeline | One kind of work (folder scan, image analysis, duplicate check, …) |
| Job | One run of a pipeline over a folder (or a preset's step) |
| Bundle | One or more jobs enqueued together, run in order |
| Queue | FIFO list of bundles not yet finished |
| Concurrency group | gpu, ollama, cpu, or io — the slot a job occupies |
| Background operations | The dock's user-facing name |
| Time left | Estimated remaining time, hidden until there is enough data |

Full definitions: [`../GLOSSARY.md`](../GLOSSARY.md).

## 7. Dependencies

**Depends on**

| Module | What it needs |
|---|---|
| [M-02](../02-catalog-and-metadata/README.md) through [M-08](../08-insights-and-library-health/README.md) | The actual pipeline implementations it schedules |
| [M-01](../01-library-browsing-and-media-viewer/README.md) | Viewer-open hides the dock |
| [M-11](../11-settings-and-configuration/README.md) | Concurrency limits UI and persistence |
| [M-12](../12-onboarding-and-help/README.md) | Setup order that queues analysis last |
| [M-13](../13-platform-and-distribution/README.md) | Local runtimes the jobs call |

**Depended on by**

Every module that starts a long job. [M-06](../06-albums/README.md),
[M-07](../07-documents/README.md) and [M-10](../10-sharing-and-presentation/README.md) do not
own pipelines of their own.

## 8. Settings owned

| Settings group (UI label) | Features affected |
|---|---|
| **Pipeline concurrency (advanced)** — GPU, Ollama, CPU, I/O group limits | F-09-04, and therefore when F-09-01 starts the next job |

## 9. Quality snapshot

| Type | Coverage |
|---|---|
| E2E | `apps/desktop-media/tests/e2e/pipeline-orchestration.spec.ts` — enqueue preset, lifecycle events, dock **Completed** |
| E2E | `apps/desktop-media/tests/e2e/duplicate-files-pipeline-cancel.spec.ts` — cancel vs dismiss |
| Unit | `pipeline-scheduler.test.ts`, `presets.test.ts`, `pipeline-queue-slice.test.ts`, `eta-formatting.test.ts` |

**Gaps:** raising concurrency in Settings has no E2E; queued-bundle removal API is untested in
the UI (the dock does not expose it).

## 10. Known gaps & direction

- Legacy per-feature dock cards still sit beside the central queue during migration; both are
  user-visible today.
- `removeQueued` / `clearQueue` exist over IPC but have no production controls.
- `RunPipelinesSheet` is a test/debug affordance, not a supported user workflow.
