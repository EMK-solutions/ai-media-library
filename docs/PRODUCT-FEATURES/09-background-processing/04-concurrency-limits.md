---
id: F-09-04
module: 09-background-processing
title: Concurrency limits
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/shared/pipeline-types.ts
  - apps/desktop-media/electron/pipelines/concurrency-config.ts
  - apps/desktop-media/src/renderer/components/PipelineConcurrencySettings.tsx
  - apps/desktop-media/electron/pipelines/pipeline-scheduler.ts
related:
  - F-09-01
  - F-11-01
---

# Concurrency limits

> Cap how many pipelines share the GPU, the local language model, the CPU and the disk at once,
> so overnight jobs do not freeze the rest of the machine.

## 1. Summary

Each pipeline belongs to a **group**: **gpu**, **ollama**, **cpu** or **io**. The scheduler will
not start a job if that group is already at its limit. Defaults keep heavy AI serial (one GPU
job and one Ollama job) and allow two disk jobs and two CPU jobs. The user can change the four
limits under Settings → **Pipeline concurrency (advanced)** when advanced settings are shown.
Changes apply on the next scheduling pass; a job that is already running is not paused or split.

Image analysis uses the Ollama group (default 1) because the local vision model serves one
request at a time. That is why the setup path runs analysis last and why two analysis jobs wait
on each other rather than doubling GPU load.

## 2. User stories

- **As someone on a laptop** I want analysis to stay at one job, **so that** fans and battery
  stay reasonable.
- **As someone with a spare GPU** I want to raise the GPU group, **so that** indexing and face
  embedding can overlap more.
- **As someone who hides advanced settings** I want the defaults to be safe without opening this
  card, **so that** I cannot accidentally set a limit of zero.

## 3. Scope

**In scope**

- Four group limits, defaults, Settings fields, clamp rules
- Which pipelines sit in which group
- Optional per-pipeline group override in the stored config (no dedicated UI)

**Out of scope**

- Choosing AI models — [M-03](../03-ai-image-analysis/README.md) / [M-11](../11-settings-and-configuration/README.md)
- Queue order — [Pipeline queue](01-pipeline-queue.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Settings screen chrome / hide advanced | [Settings](../11-settings-and-configuration/README.md) |
| Ollama as a runtime | [M-13](../13-platform-and-distribution/README.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-09-04.1 | Default caps | gpu 1, ollama 1, cpu 2, io 2 | shipped |
| F-09-04.2 | Settings card | Four number fields, copy describing which pipelines share each group | shipped |
| F-09-04.3 | Sanitise on save | Limits stored as integers from 1 to 8 even if Settings UI max differs | shipped |

## 5. User journeys

### J-09-04-1 — Leave the defaults

**Trigger:** the user never opens the concurrency card.
**Preconditions:** none.

1. Scheduler reads `DEFAULT_PIPELINE_CONCURRENCY`.
2. At most one vision-model job and one Ollama job run; two scans or duplicate checks may
   overlap.

**Outcome:** the machine stays usable with no configuration.

### J-09-04-2 — Raise I/O for parallel scans

**Trigger:** Settings → show advanced → **I/O group limit** set to 3.
**Preconditions:** advanced settings are visible.

1. The store updates; persistence writes `pipelineConcurrency`.
2. The next `tick()` uses the new cap; in-flight jobs keep running.

**Outcome:** a third disk-bound job can start while two others run.

**Failure paths**

- Advanced settings hidden → the card is not shown; last saved (or default) limits still apply.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Pipeline concurrency (advanced) | Settings | GPU / Ollama / CPU / I/O fields and descriptions | `apps/desktop-media/src/renderer/components/PipelineConcurrencySettings.tsx` |

**States**

| State | What the user sees |
|---|---|
| Hide advanced settings | Card `hidden` |
| Values | GPU & Ollama steppers 1–4; CPU & I/O 1–8 |

**UX notes** — The card warns that raising limits can starve other apps. Ollama copy says keep 1
unless multiple model instances exist.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Defaults are `{ gpu: 1, ollama: 1, cpu: 2, io: 2 }`. | Matches "heavy AI stays serial". | `DEFAULT_PIPELINE_CONCURRENCY` |
| BR-2 | A group with no spare slots causes the next job in that group to wait, even if it is first in FIFO among *other* groups' jobs. | FIFO is per scheduler walk, capacity is per group. | `pipeline-scheduler.ts` `hasGroupCapacity` |
| BR-3 | Stored limits are clamped to integers 1–8 (never 0). | A zero cap would deadlock the queue. | `concurrency-config.ts` |
| BR-4 | `perPipelineGroupOverride` may move a pipeline to another group; the Settings card does not expose this. | Escape hatch for support / future UI. | `PipelineConcurrencyConfig` |
| BR-5 | Group membership (unless overridden): **gpu** — rotation precheck, face detection, face embedding, semantic index, description embedding, desc-embedding backfill; **ollama** — photo analysis, path-LLM analysis; **cpu** — path-rule extraction, face clustering, similar-untagged counts; **io** — metadata scan, gps-geocode, geocoder-init, folder duplicate scan, duplicate delete. | Jobs that share a bottleneck share a cap. | `electron/pipelines/definitions/` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| GPU group limit | 1 | Max parallel gpu-group pipelines | Yes |
| Ollama (LLM) group limit | 1 | Max parallel photo-analysis / path-LLM jobs | Yes |
| CPU group limit | 2 | Clustering, path rules, similar-face counts | Yes |
| I/O group limit | 2 | Scan, geocode, duplicate scan/delete | Yes |

Persisted with other app settings (`pipelineConcurrency`). UI max for GPU/Ollama is 4; sanitise
still allows up to 8 if written another way.

## 9. Data & persistence

Limits live in app settings (user data) and survive restart. They do not travel with the media
files. In-memory `concurrency-config.ts` is updated when settings save.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Settings hydration | Non-default caps | Defaults until `readSettings` completes |
| Hardware / Ollama | Jobs actually finishing | Jobs still *start* up to the cap, then fail on the card |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| Settings save of `pipelineConcurrency` | `groupLimits` | Persist and `setPipelineConcurrencyConfig` |
| Scheduler `getConcurrency()` | — | Read current caps each tick |

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| Unit | `apps/desktop-media/electron/pipelines/__tests__/pipeline-scheduler.test.ts` | Capacity: second same-group job waits |
| Unit | Defaults imported from `pipeline-types.ts` | gpu/ollama/cpu/io numbers |

**Coverage gaps:** `concurrency-config.ts` sanitise (1–8) has no dedicated test file;
Settings UI max 4 vs sanitise max 8 is untested as a product rule.

## 13. Known limitations & open questions

- **Limitation:** Settings copy for I/O lists metadata-scan, gps-geocode and geocoder-init but
  omits duplicate scan and delete, which also use `io`.
- **Limitation:** GPU/Ollama UI max is 4 while the sanitiser allows 8.
- **Open question:** whether photo-analysis should ever share a GPU group with embeddings; today
  it is Ollama-only by design.

## 14. References

- Module: [Background Processing](README.md)
- [Pipeline queue](01-pipeline-queue.md)
- Settings owner: [M-11](../11-settings-and-configuration/README.md)
