---
id: F-09-03
module: 09-background-processing
title: Cancellation & ETA
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/progress-dock/ProgressDockCloseButton.tsx
  - apps/desktop-media/src/renderer/components/progress-dock/PipelineQueueCards.tsx
  - apps/desktop-media/src/renderer/lib/eta-formatting.ts
  - apps/desktop-media/src/renderer/hooks/use-eta-tracking.ts
  - apps/desktop-media/src/renderer/components/progress-dock/cards/use-progress-eta.ts
related:
  - F-09-01
  - F-09-02
---

# Cancellation & ETA

> Stop a running job from Background operations, dismiss a finished card without touching the
> process, and see **Time left** once the app has enough real speed to estimate.

## 1. Summary

Every operation card uses one **X** control. While the job is running, **X** means cancel and
hide (the scheduler abort signal fires; cooperative pipelines stop between files). After the job
has completed, failed or cancelled, **X** only dismisses the card. There is no second icon.

**Time left** is omitted at the start of a job and whenever the estimate would be zero or
invalid, so the label does not flicker `0 min`. When shown, durations are rounded **up** to the
next full minute and formatted compactly (`3min`, `1h20min`, or `1d 12h 18min` past 24 hours).
Legacy analysis/face/index cards estimate from a rolling window of up to 15 recently finished
files (at least 3). Some queue cards use overall elapsed-versus-progress instead.

## 2. User stories

- **As someone who queued the wrong tree** I want one obvious stop control, **so that** I do not
  hunt for Pause versus Close.
- **As someone watching overnight analysis** I want a stable time-left figure, **so that** I can
  decide whether to leave the machine on.
- **As someone who finished a scan** I want to clear the card, **so that** the dock is quiet
  again.

## 3. Scope

**In scope**

- **X** semantics for running vs terminal cards
- Bundle cancel vs job abort
- Time left formatting and when it is hidden
- Duplicate-scan cancel bookkeeping so results are not attached

**Out of scope**

- Which pipelines are cancellable internally — they all receive AbortSignal; a pipeline that
  ignores it may finish the current file first
- Concurrency — [Concurrency limits](04-concurrency-limits.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Metadata scan auto-hide when nothing changed | [Folder scan](../02-catalog-and-metadata/01-folder-scan-and-catalog/README.md) |
| Duplicate scan cancel vs dismiss E2E | [Duplicate files](../08-insights-and-library-health/02-duplicate-files/README.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-09-03.1 | Running **X** | Cancel the bundle (queue cards) or the legacy job | shipped |
| F-09-03.2 | Terminal **X** | Dismiss only | shipped |
| F-09-03.3 | Time left | Compact estimate after enough samples / progress | shipped |
| F-09-03.4 | Skip downstream | Cancelling a bundle step skips later `requireSuccess` jobs | shipped |

## 5. User journeys

### J-09-03-1 — Cancel a running bundle

**Trigger:** the user presses **X** on a running queue card (for example **Check duplicate
files**).
**Preconditions:** the bundle state is running.

1. `pipelines:cancel-bundle` runs; the in-flight job's abort fires; pending jobs in the bundle
   become cancelled.
2. The card moves to Completed as **Cancelled** (amber).
3. For duplicate scan, the job id is marked so a late completion cannot fill the workspace.

**Outcome:** work stops; findings or catalog writes already made stay.

**Failure paths**

- A pipeline finishes the current file before noticing abort → a short delay, then cancelled.

### J-09-03-2 — Dismiss a finished card

**Trigger:** **X** on a succeeded, failed or cancelled card.

1. `dismissRecentBundle` hides it; no cancel IPC.

**Outcome:** the dock is tidier; the job is already over.

### J-09-03-3 — Read time left

**Trigger:** a long analysis or index job is running with items completing.

1. Until at least three recent item timings exist (legacy tracker), **Time left** is absent.
2. The label appears on the right of the summary line, counters on the left.
3. The figure can rise or fall as speed changes; display is ceiled to whole minutes.

**Outcome:** the user has a rough remaining duration, never a blinking zero.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Queue card **X** | Running or recent bundle | Cancel vs Dismiss aria-labels | `PipelineQueueCards.tsx`, `ProgressDockCloseButton.tsx` |
| Legacy card **X** | Older jobs | Same single-icon rule | `progress-dock/cards/*` |
| Time left | Running cards that implement ETA | `Time left` + compact duration | `use-eta-tracking.ts`, `use-progress-eta.ts` |

**States**

| State | What the user sees |
|---|---|
| Running, no estimate yet | Counts only |
| Estimate ready | **Time left** `Nmin` / `Nh` / `NhNmin` / `Nd Nh Nmin` |
| Photo analysis loading model | Right text: **Loading AI model … - it may take 1-2min** (not Time left) |
| Cancelled | Amber **Cancelled** on the completed card |

**UX notes** — `BOTTOM-APP-PANEL-UX.md` §1–4 is still the product rule for the single **X**.
Pointer-down on the close button is handled so the click is not lost.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Running **X** cancels; terminal **X** dismisses. One icon in both states. | Users must not learn two glyphs. | `BOTTOM-APP-PANEL-UX.md`; queue cards |
| BR-2 | Compact time left is null for non-finite, ≤0 seconds. | Avoids `0min`. | `eta-formatting.ts` `formatTimeLeftCompact` |
| BR-3 | Display minutes are `max(1, ceil(seconds/60))` when a duration is shown. | Sub-minute jobs still read as 1min if shown. | Same |
| BR-4 | Legacy rolling ETA uses at most 15 recent samples and needs at least 3. | Early speed is too noisy. | `use-eta-tracking.ts` |
| BR-5 | Queue-card ETA (`use-progress-eta`) uses elapsed / fraction complete, and hides at 0 processed or when complete. | Bundles without per-file samples still get a number once progress moves. | `use-progress-eta.ts` |
| BR-6 | Cancelling a running bundle does not roll back catalog writes already committed. | Partial progress is better than corrupt undo. | Scheduler abort + pipeline implementations |

## 8. Settings & defaults

None. Window size 15 and minimum 3 samples are code constants, not Settings.

## 9. Data & persistence

Cancel flags and dismissed cards are session-only. Time left is not stored.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| AbortSignal in the pipeline | Prompt cancel | Job continues until the next check |
| Progress totals | Queue-card ETA | Time left hidden |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `pipelines:cancel-bundle` | `bundleId` | Stop the whole bundle |
| `pipelines:cancel-job` | `jobId` | Stop one step; downstream may skip |
| Legacy `media:cancel-*` | job id | Older cards still call feature-specific cancel |

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/duplicate-files-pipeline-cancel.spec.ts` | Running **X** cancels; completed **X** dismisses |
| Unit | `apps/desktop-media/src/renderer/lib/eta-formatting.test.ts` | Compact formatting, nulls, day threshold |
| Unit | `apps/desktop-media/electron/pipelines/__tests__/pipeline-scheduler.test.ts` | Cancel bundle/job, skip after cancel |

**Coverage gaps:** rolling-window ETA logic in `use-eta-tracking.ts` has no dedicated test file
listed here; formatting is well covered.

## 13. Known limitations & open questions

- **Limitation:** two ETA methods can disagree if a job is shown on both a legacy card and a
  queue card.
- **Limitation:** queued (not yet running) bundles have no **X** to remove them.
- **Open question:** whether Time left should appear on every queue card or only analysis-like
  jobs.

## 14. References

- Module: [Background Processing](README.md)
- [Progress dock](02-progress-dock.md)
