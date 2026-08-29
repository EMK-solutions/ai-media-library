---
id: F-09-01
module: 09-background-processing
title: Pipeline queue & orchestration
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/electron/pipelines/pipeline-scheduler.ts
  - apps/desktop-media/electron/pipelines/presets.ts
  - apps/desktop-media/src/shared/pipeline-types.ts
  - apps/desktop-media/src/shared/pipeline-ipc.ts
  - apps/desktop-media/electron/ipc/pipeline-orchestration-handlers.ts
related:
  - F-09-02
  - F-09-03
  - F-09-04
  - F-02-01
  - F-08-01
---

# Pipeline queue & orchestration

> Hand the app one or more jobs for a folder, have them run in a sensible order, and keep using
> the library while they wait or run.

## 1. Summary

The scheduler is the single queue behind folder scan, AI pipelines, duplicate check, deletion
and geocoding. The user never names "bundles", but they feel the behaviour: work is accepted
immediately, appears as queued or running, and does not lock the grid. Jobs in one bundle run
strictly in sequence (geocoder download then reverse geocode). Different bundles may overlap
when their resource groups have spare slots.

Starting a second copy of the **same** pipeline on a folder already covered by a running or
queued job is rejected so two scans do not fight. After a folder scan, the user is expected to
**enqueue** search indexing, faces and — last — image analysis, rather than waiting in place
([JOURNEYS.md](../JOURNEYS.md) J-X1).

## 2. User stories

- **As a library owner** I want to start work on folder B while folder A is still analysing,
  **so that** I batch overnight jobs.
- **As someone who clicked Play twice** I want the second click to do nothing harmful,
  **so that** I do not get two overlapping analyses.
- **As a new user** I want pipelines after scan to sit in the queue, **so that** I can keep
  browsing instead of watching a blocking dialog.

## 3. Scope

**In scope**

- Enqueue (single job or preset), FIFO, sequential jobs in a bundle
- Duplicate-active-job rejection for overlapping folder scopes
- Queue snapshots and lifecycle events to the renderer
- Known presets: reverse geocode, path dates, path + GPS

**Out of scope**

- How each pipeline processes a file — owning modules
- Dock chrome — [Progress dock](02-progress-dock.md)
- Limit numbers — [Concurrency limits](04-concurrency-limits.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Folder scan job body | [Folder scan & catalog](../02-catalog-and-metadata/01-folder-scan-and-catalog/README.md) |
| Dashboard Play wiring | [Folder AI analysis dashboard](../08-insights-and-library-health/01-folder-ai-analysis-dashboard/README.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-09-01.1 | FIFO bundles | Later Play waits its turn when the group is full | shipped |
| F-09-01.2 | Sequential bundle jobs | Multi-step work (init then geocode) stays in order | shipped |
| F-09-01.3 | Cross-bundle overlap | Disk job can run beside a GPU job when limits allow | shipped |
| F-09-01.4 | Overlap guard | Same pipeline + covering folder cannot be queued twice | shipped |
| F-09-01.5 | Presets | Geo-only, path-rule-only, path-and-geo | shipped |
| F-09-01.6 | Recent window | Last 20 finished bundles kept for the dock | shipped |

## 5. User journeys

### J-09-01-1 — Enqueue and keep browsing

**Trigger:** the user starts face detection (or any pipeline) on a folder.
**Preconditions:** the folder is selected.

1. Enqueue returns at once; a bundle appears as running or queued.
2. The user selects another folder; thumbnails still stream.
3. Progress continues in Background operations.

**Outcome:** the library stayed usable for the whole job.

**Failure paths**

- Unknown pipeline or bad params → enqueue fails; the UI shows the rejection if it surfaces
  one.

### J-09-01-2 — Queue a second folder

**Trigger:** image analysis is already running on folder A; the user starts it on folder B.

1. If the Ollama slot is full (default one job), B is **Queued**.
2. When A finishes, B starts.

**Outcome:** both folders are processed without the user waiting between clicks.

**Alternate paths**

- B is inside A's recursive scope and the same pipeline is still active → rejected:
  already running or queued for A's path. Dashboard Play shows queued/running instead of a
  dialog.

### J-09-01-3 — Preset chain (geocode)

**Trigger:** Geo-location Play or (in test UI) **Reverse geocode GPS**.

1. Bundle jobs: geocoder init, then gps-geocode.
2. If init fails, geocode is **skipped** (`requireSuccess`).

**Outcome:** place names fill in, or the dock shows the failed/skipped chain.

## 6. Screens & UX

This feature has no screen of its own. The user sees names and states on dock cards
([Progress dock](02-progress-dock.md)). Test-only **Run pipelines** lists the three presets
(`RunPipelinesSheet.tsx`); submit label is **Run now** or **Add to queue** if anything is already
running.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Bundles are appended FIFO; scheduling walks that order. | Predictable "who is next". | `pipeline-scheduler.ts` |
| BR-2 | Only one job per bundle runs at a time; the next pending job starts after the previous is terminal. | Preset steps have order. | Same |
| BR-3 | A job whose upstream binding `requireSuccess` is not met is skipped. | Do not geocode if the database never downloaded. | Same |
| BR-4 | Same `pipelineId` already pending/running on a folder that **covers** the new path → `duplicate-active-job`. | Prevents nested double work. | Same; `pipeline-folder-scope.ts` |
| BR-5 | Up to 20 terminal bundles stay in `recent` for the dock. | History without unbounded memory. | `RECENT_BUNDLES_LIMIT` |
| BR-6 | Queue snapshots broadcast to all windows. | Two windows must not disagree. | `pipeline-orchestration-handlers.ts` |

## 8. Settings & defaults

None on the queue itself. Group limits (default gpu 1, ollama 1, cpu 2, io 2) are F-09-04.

## 9. Data & persistence

The queue is in-memory for the app session. Closing the app drops queued/running jobs; catalog
results already written remain. There is no resume-on-launch of an interrupted bundle.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Registered pipeline definitions | Any enqueue | `unknown-pipeline` rejection |
| Folder path on disk / catalog | Job body | Job **failed** with an error on the card |

Pipeline ids (user-facing work): `metadata-scan`, `path-rule-extraction`, `gps-geocode`,
`geocoder-init`, `image-rotation-precheck`, `face-detection`, `face-embedding`,
`face-clustering`, `photo-analysis`, `description-embedding`, `semantic-index`,
`desc-embedding-backfill`, `path-llm-analysis`, `similar-untagged-counts`,
`folder-duplicate-scan`, `duplicate-marked-files-delete`
(`apps/desktop-media/src/shared/pipeline-types.ts`).

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `pipelines:enqueue-bundle` | `single-job` or `preset` | Queue work |
| `pipelines:cancel-bundle` / `cancel-job` | ids | Stop work (F-09-03) |
| `pipelines:remove-queued` / `clear-queue` | bundle id / none | Drop queued bundles (no production UI) |
| `pipelines:get-snapshot` | — | Running / queued / recent |
| `pipelines:queue-changed` / `job-progress` / `lifecycle` | events | Keep the dock in sync |

`apps/desktop-media/src/shared/pipeline-ipc.ts`. Renderer: `window.desktopApi.pipelines.*`.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/pipeline-orchestration.spec.ts` | Preset enqueue, lifecycle, dock completed section |
| Unit | `apps/desktop-media/electron/pipelines/__tests__/pipeline-scheduler.test.ts` | FIFO, skip, cancel, overlap, capacity |
| Unit | `apps/desktop-media/electron/pipelines/__tests__/presets.test.ts` | geo-only / path-rule-only / path-and-geo job graphs |
| Unit | `apps/desktop-media/src/renderer/stores/pipeline-queue-slice.test.ts` | Snapshot apply, dismiss recent, progress patch |

**Coverage gaps:** overlap rejection is unit-tested; dashboard silent handling is not E2E.

## 13. Known limitations & open questions

- **Limitation:** the queue does not survive app restart.
- **Limitation:** `PipelineBlockedDialog` is unused; overlap is silent or a string error.
- **Open question:** whether Play should offer "add another folder" when overlap is rejected,
  instead of ignoring the click.

## 14. References

- Module: [Background Processing](README.md)
- [Progress dock](02-progress-dock.md), [Cancellation & ETA](03-cancellation-and-eta.md),
  [Concurrency limits](04-concurrency-limits.md)
- `docs/ROADMAP/pipeline-orchestration-followups.md`
