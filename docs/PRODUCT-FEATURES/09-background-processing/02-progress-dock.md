---
id: F-09-02
module: 09-background-processing
title: Progress dock
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/DesktopProgressDock.tsx
  - apps/desktop-media/src/renderer/components/progress-dock/
  - apps/desktop-media/src/renderer/stores/pipeline-queue-slice.ts
related:
  - F-09-01
  - F-09-03
  - F-01-03
---

# Progress dock

> A collapsible **Background operations** strip at the bottom of the window that lists what is
> running, waiting and recently finished.

## 1. Summary

The dock is the only user-facing progress panel in the desktop app. It shows central-queue
bundle cards (running, **Queued (n)**, **Completed (n)**) and, during migration, still shows
legacy cards for metadata scan, image analysis, face detection, search indexing, rotation,
geocoder download, face clustering, similar-face counts and description-embedding backfill. The
header reads **Background operations**, with a spinner while anything is running, and chevrons
to collapse or expand. The dock hides while the media viewer is open so a slideshow is not
covered; jobs are unaffected.

Zustand `BottomPanelSlice` is composed into the desktop store but **is not rendered**. Do not
treat `packages/media-store` `BottomPanel` as the shipped UI.

## 2. User stories

- **As someone who started a long job** I want a persistent place to watch counts, **so that** I
  do not have to stay on the folder I started from.
- **As someone doing a slideshow** I want the dock out of the way, **so that** the viewer is
  full screen.
- **As someone with finished jobs** I want a short completed list I can hide, **so that** the
  dock does not grow forever.

## 3. Scope

**In scope**

- Visibility, collapse, header, queue cards, completed section (first three recent bundles)
- Coexistence with legacy feature cards
- Hide when the viewer is open

**Out of scope**

- Cancel and Time left rules — [Cancellation & ETA](03-cancellation-and-eta.md)
- Scheduling — [Pipeline queue](01-pipeline-queue.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Auto-hide of a no-op metadata scan | [Folder scan](../02-catalog-and-metadata/01-folder-scan-and-catalog/README.md) and `BOTTOM-APP-PANEL-UX.md` |
| Viewer overlay | [Media viewer](../01-library-browsing-and-media-viewer/03-media-viewer-and-slideshow.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-09-02.1 | Header | **Background operations**, expand/collapse | shipped |
| F-09-02.2 | Queue columns | Running cards, Queued group, Completed disclosure | shipped |
| F-09-02.3 | Legacy cards | Older per-pipeline cards still appear when those jobs run | shipped |
| F-09-02.4 | Viewer hide | Dock unmounts while the viewer is open | shipped |
| F-09-02.5 | Auto-expand | Starting work from menus expands a collapsed dock | shipped |

## 5. User journeys

### J-09-02-1 — Watch a job

**Trigger:** a pipeline is enqueued.
**Preconditions:** the viewer is closed.

1. If the dock was collapsed, it expands (`setProgressPanelCollapsed(false)` from start
   handlers).
2. A running card shows the display name, counts and a progress bar (minimum visible 2% while
   running at 0%).
3. Multi-job bundles prefix **k/n:** on the title and show a job breadcrumb.

**Outcome:** the user can name what is happening without opening Insights.

### J-09-02-2 — Collapse and return

**Trigger:** the user presses the collapse control.

1. The dock shrinks to the header strip; work continues.
2. Expand restores the cards.

**Outcome:** more room for the grid without cancelling anything.

### J-09-02-3 — Open the viewer

**Trigger:** the user opens a photo.

1. The dock is not shown (`shouldShow` is false when `viewerOpen`).
2. Closing the viewer shows the dock again if cards still qualify.

**Outcome:** presentation is unobstructed; Background operations resume visually afterwards.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Dock | Any qualifying job or recent bundle | Header, cards | `DesktopProgressDock.tsx` |
| Header | Always when dock shown | Title, optional **Run pipelines** (test flag), collapse | `progress-dock/ProgressDockHeader.tsx` |
| Queue cards | Scheduler snapshot | Running / Queued / Completed | `progress-dock/PipelineQueueCards.tsx` |
| Legacy cards | Older IPC progress | Scan, analysis, faces, index, rotation, … | `progress-dock/ProgressDockCards.tsx` |

**States**

| State | What the user sees |
|---|---|
| Nothing running or recent | Dock not shown (unless test **Run pipelines** idle strip) |
| Queued only | **Queued (n)** section; no progress bar on those rows |
| Completed | Collapsed **Completed (n)**; geocoder success can force the section open |
| Idle test UI | `EMK_E2E_RUN_PIPELINES_UI=1` shows an idle strip with **Run pipelines** |

**UX notes**

- Completed queue cards: at most three bundles plus an optional geocoder-recent card.
- Dismissed recent bundle ids stay dismissed for the session (`dismissedRecentBundleIds`).
- `aria-label` of the dock is **Background operations**.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | The dock shows when the viewer is closed and either a legacy card qualifies or the pipeline snapshot has running, queued or recent bundles (or a recent geocoder completion). | Empty chrome is noise; silent jobs are worse. | `DesktopProgressDock.tsx` |
| BR-2 | Collapse state is React local state on the app shell, not `BottomPanelSlice`. | Desktop owns this panel. | `App.tsx` `progressPanelCollapsed` |
| BR-3 | Starting user-owned jobs expands the dock. | The user just asked for work and should see it. | Various `setProgressPanelCollapsed(false)` handlers |
| BR-4 | Queue UI shows at most three recent bundles even though the scheduler keeps 20. | Keep the completed list short. | `PipelineQueueCards.tsx` |

## 8. Settings & defaults

None — collapse is session UI state, not a saved setting.

## 9. Data & persistence

Queue arrays live in `pipeline-queue-slice.ts` and reset on process restart. Collapse does not
persist. Dismissed completed cards do not persist.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Scheduler snapshots | Queue cards | Legacy cards may still show for older IPC jobs |
| Viewer state | Hide/show | Dock could overlap the viewer if `viewerOpen` were wrong |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `setPipelineQueueSnapshot` / `patchJobProgress` | snapshot / progress | Drive cards |
| `dismissRecentBundle` | `bundleId` | Hide a completed card |
| Collapse toggle | boolean | Header chevron |

No IPC to collapse; it is renderer-only.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/pipeline-orchestration.spec.ts` | Bundle appears; completed section |
| Unit | `apps/desktop-media/src/renderer/stores/pipeline-queue-slice.test.ts` | Snapshot and dismiss |
| Unit | `apps/desktop-media/src/renderer/lib/pipeline-queue-progress-stats.test.ts` | Card stat lines |

**Coverage gaps:** viewer-hide and collapse have no dedicated E2E in the files listed for this
module.

## 13. Known limitations & open questions

- **Limitation:** two card systems (legacy + queue) can show related work twice during
  migration.
- **Limitation:** queued bundles cannot be removed from the dock (IPC exists, no **X**).
- **Limitation:** **Run pipelines** is not a supported product entry point.

## 14. References

- Module: [Background Processing](README.md)
- [Pipeline queue](01-pipeline-queue.md)
