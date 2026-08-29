---
id: F-11-02
module: 11-settings-and-configuration
title: Settings ownership index
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx
  - apps/desktop-media/src/renderer/components/PipelineConcurrencySettings.tsx
  - apps/desktop-media/src/shared/ipc.ts
related:
  - F-11-01
---

# Settings ownership index

> A product map of every Settings group to the feature that owns its behaviour — not a
> user-facing screen.

## 1. Summary

The Settings page hosts many cards. Behaviour, defaults, and bugs belong to the feature that
*uses* each control, not to the Settings chrome. This document is the PM index: UI label →
feature ID. When a numbered feature document is not written yet, the module ID is still given
and the gap is marked.

Users never open this index. They see the cards listed in [Settings screen](01-settings-screen.md).

## 2. User stories

- **As a product manager** I want one table of Settings groups and owners, **so that** a
  default change is filed against the right feature.
- **As a writer of feature docs** I want a place that states “this control is not owned by
  M-11”, **so that** Settings does not duplicate every threshold.
- Not for end users.

## 3. Scope

**In scope**

- Catalog of Settings page groups (and page chrome) → owning feature IDs
- Which groups are hidden when **Hide advanced settings** is on

**Out of scope**

- Explaining what each control does (see the owning feature)
- Installer-only prompts (those are not Settings cards)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| How the page works | [Settings screen](01-settings-screen.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-11-02.1 | Ownership catalog | This table | shipped |

## 5. User journeys

n/a — this is an index.

## 6. Screens & UX

n/a — no dedicated screen. Cards appear on the Settings page in the order below
(`DesktopSettingsSection.tsx`, then `PipelineConcurrencySettings.tsx`).

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | A Settings control’s default and behaviour are documented on the owning feature, not duplicated as a second source of truth here. | Prevents this index and feature docs drifting. | This document |
| BR-2 | Cards marked **Yes** under Advanced are omitted while **Hide advanced settings** is on. Fields marked **Partial** hide only some rows. | Matches the shipped UI. | `DesktopSettingsSection.tsx` |

## 8. Settings & defaults

None — this feature exposes no user settings. It catalogs other features’ settings.

## 9. Data & persistence

None beyond the owning features’ keys in `media-settings.json`.

## 10. Dependencies & failure modes

n/a

## 11. Automatable actions & API surface

n/a

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/settings.spec.ts` | A subset of labels (file metadata, hide advanced, face detection when shown) |
| E2E | `apps/desktop-media/tests/e2e/tv-broadcast.spec.ts` | **Broadcast album to TV** card |

**Coverage gaps:** no test that the full card list and advanced visibility match this table.

## 13. Known limitations & open questions

- **Limitation:** M-05, M-06, M-08 and M-09 do not yet have numbered feature files in
  `docs/PRODUCT-FEATURES/`. IDs below are allocated to match the [module map](../README.md)
  and should be reused when those docs are written — do not renumber.
- **Open question:** empty-folder AI summary lives on the scanning card but changes Insights
  navigation; keep F-08-01 as owner unless Insights docs choose otherwise.

## 14. References

- Module: [Settings & Configuration](README.md)
- [Settings screen](01-settings-screen.md)
- Product module map: [`../README.md`](../README.md)

---

## Catalog (page order)

| Settings group (UI label) | Advanced? | Owning feature | ID |
|---|---|---|---|
| Hide advanced settings | — (chrome) | Settings screen | F-11-01 |
| Features overview (button) | No | First-run welcome | [F-12-01](../12-onboarding-and-help/01-first-run-welcome.md) |
| AI models & licenses (button) | No | AI models & licenses | [F-12-03](../12-onboarding-and-help/03-ai-models-and-licenses.md) |
| **Image / Video viewer** | No | Media viewer & slideshow | [F-01-03](../01-library-browsing-and-media-viewer/03-media-viewer-and-slideshow.md) |
| **Broadcast album to TV** | No | TV broadcast | [F-10-01](../10-sharing-and-presentation/01-tv-broadcast.md) |
| **Albums** (default filters, excluded categories) | No | Smart albums (docs pending) | F-06-02 |
| **Folder scanning, file metadata and Geo-location** — add-root full scan, outdated-after days, auto-scan-on-select | Partial | Folder scan & catalog | [F-02-01](../02-catalog-and-metadata/01-folder-scan-and-catalog/README.md) |
| Same card — **Extract date(s) from file path**, **Detect location and dates from file paths using AI (LLM)** | Partial (LLM is advanced) | Path-based metadata extraction | [F-02-05](../02-catalog-and-metadata/05-path-based-metadata-extraction.md) |
| Same card — **Detect Country / City from GPS…** | No | Location metadata | [F-02-04](../02-catalog-and-metadata/04-location-metadata.md) |
| Same card — **Update file metadata on change of Rating, Title, Description** | No | Embedded metadata write-back | [F-02-06](../02-catalog-and-metadata/06-embedded-metadata-write-back.md) |
| Same card — **On empty folder selection show AI analysis status summary…** | No | Folder insights (docs pending) | F-08-01 |
| **Graphic card usage (GPU)** | Yes | GPU & inference | [F-11-03](03-gpu-and-inference.md) |
| **Wrong image rotation detection** | Yes | Wrong rotation detection | [F-03-03](../03-ai-image-analysis/03-wrong-rotation-detection.md) |
| **AI image search** | Partial (thresholds / keyword rerank advanced) | AI image search (docs pending) | F-05-01 |
| **Face detection** | Yes | Face detection | [F-04-01](../04-people-and-faces/01-face-detection.md) |
| **Face recognition** | Yes | Face recognition; untagged grouping | [F-04-02](../04-people-and-faces/02-face-recognition.md), [F-04-03](../04-people-and-faces/03-untagged-face-grouping.md) |
| **AI image analysis** | Partial (timeout, downscale, prompts advanced) | Analysis, prompts/models, invoice extraction | [F-03-01](../03-ai-image-analysis/01-ai-image-analysis.md), [F-03-02](../03-ai-image-analysis/02-analysis-prompts-and-models.md), [F-03-05](../03-ai-image-analysis/05-invoice-and-receipt-extraction.md) |
| **Pipeline concurrency (advanced)** | Yes | Background processing (docs pending) | F-09-01 |
| **Application data files** | Yes | App data locations | [F-11-04](04-app-data-locations.md) |

Shipped defaults for each control live in `apps/desktop-media/src/shared/ipc.ts` (and
`DEFAULT_PIPELINE_CONCURRENCY` in `apps/desktop-media/src/shared/pipeline-types.ts`: GPU 1,
Ollama 1, CPU 2, I/O 2).
