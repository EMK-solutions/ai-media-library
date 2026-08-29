---
id: F-11-03
module: 11-settings-and-configuration
title: GPU & inference
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/electron/ai-inference-gpu.ts
  - apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx
  - apps/desktop-media/src/renderer/components/PipelineConcurrencySettings.tsx
related:
  - F-11-01
  - F-04-01
  - F-03-01
  - F-09-01
---

# GPU & inference

> Pick which graphics adapter on-device models should use, and (for advanced users) how many
> GPU- or Ollama-backed jobs may run at once.

## 1. Summary

Face detection, embeddings, rotation classification and similar ONNX work can run on the GPU.
On Windows the Settings card **Graphic card usage (GPU)** lists detected adapters plus
**Automatic (runtime default)**. Choosing an adapter is a preference the next inference session
honours; Windows itself may still schedule the app on the integrated GPU unless the user also
sets **High performance** in Windows Graphics settings — the card includes that checklist.

How many pipelines may share the GPU or Ollama at once is a separate advanced card,
**Pipeline concurrency (advanced)**. Defaults keep heavy AI strictly serial so the machine
stays usable.

## 2. User stories

- **As someone with a laptop that has two GPUs** I want to point inference at the discrete
  card, **so that** face detection is not stuck on slow integrated graphics.
- **As a cautious user** I want this hidden until I show advanced settings, **so that** I am
  not asked to pick a DirectML adapter on day one.
- This is **not** where the user chooses the Ollama *model* — that stays on AI image analysis
  and search cards.

## 3. Scope

**In scope**

- GPU adapter preference for ONNX / DirectML inference
- In-app copy for Windows Graphics “High performance”
- Related: pipeline concurrency limits (hosted on Settings; product-owned with M-09)

**Out of scope**

- Installing Ollama or pulling LLM weights — [Local AI runtime](../13-platform-and-distribution/03-local-ai-runtime.md)
- Which detector or analysis model is selected — F-04-01 / F-03-02

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Settings chrome / hide advanced | [Settings screen](01-settings-screen.md) |
| Face jobs using the GPU | [Face detection](../04-people-and-faces/01-face-detection.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-11-03.1 | GPU adapter picker | Auto or a detected DirectML adapter | shipped (Windows list; other OS: Auto only) |
| F-11-03.2 | Windows GPU guide | Collapsible steps to force High performance | shipped |
| F-11-03.3 | Pipeline group limits | GPU / Ollama / CPU / I/O concurrency (advanced card) | shipped |

## 5. User journeys

### J-11-03-1 — Prefer the discrete GPU

**Trigger:** Settings, advanced settings visible.
**Preconditions:** Windows; more than one video controller.

1. Expand **Graphic card usage (GPU)**.
2. Choose `DirectML adapter N: <name>` instead of Automatic.
3. Optionally expand **Windows settings to enforce GPU use** and set the app to High performance.
4. Restart the app, run Face detection, confirm GPU use in Task Manager if needed.

**Outcome:** later ONNX sessions receive the selected DirectML device id.

**Alternate paths**

- Detection fails or the OS is not Windows → only **Automatic (runtime default)** appears.
- User leaves Automatic → the app does not pin a device id.

**Failure paths**

- Windows ignores the preference → the in-card guide is the mitigation; there is no error toast.

### J-11-03-2 — Allow more parallel GPU jobs

**Trigger:** **Pipeline concurrency (advanced)** card.

1. Raise **GPU group limit** above 1 (max 4 in the field; store clamps 1–8).
2. The next scheduling pass uses the new limit; jobs already running are not stopped.

**Outcome:** more GPU-group pipelines may overlap — at the cost of contention.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Graphic card usage (GPU) | Settings, advanced shown | Adapter `<select>`, Windows guide | `DesktopSettingsSection.tsx` |
| Pipeline concurrency (advanced) | Below analysis card, advanced shown | Four numeric limits | `PipelineConcurrencySettings.tsx` |

**States**

| State | What the user sees |
|---|---|
| Advanced hidden | Neither card |
| No adapters detected | Automatic only |
| Preference Auto | No device pinned |

**UX notes**

- Card title is **Graphic card usage (GPU)**; inner heading **GPU usage for AI inference**.
- Changing GPU preference resets native ONNX sessions so the next run picks up the device.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Default preferred GPU id is unset (`null` → Automatic). | Safe on machines with one GPU or none. | `apps/desktop-media/src/shared/ipc.ts` |
| BR-2 | Adapter names are detected on Windows via `Win32_VideoController`; other platforms keep Auto only. | DirectML device indexes are a Windows concern. | `apps/desktop-media/electron/ai-inference-gpu.ts` |
| BR-3 | Saving settings applies `EMK_ONNX_DML_DEVICE_ID` (and label) or clears them for Auto. | Native sessions read the preference from the environment. | `ai-inference-gpu.ts`, `fs-handlers.ts` (`saveSettings`) |
| BR-4 | Default concurrency is GPU 1, Ollama 1, CPU 2, I/O 2. | Heavy AI stays serial; disk/CPU work may overlap a little. | `apps/desktop-media/src/shared/pipeline-types.ts` |
| BR-5 | Concurrency changes apply on the next scheduling pass, not mid-job. | Avoids killing in-flight analysis. | `PipelineConcurrencySettings.tsx` copy; `saveSettings` → scheduler |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| GPU usage for AI inference | Automatic (runtime default) | Pins DirectML adapter or not | Yes |
| GPU group limit | 1 | Parallel GPU-group pipelines | Yes |
| Ollama (LLM) group limit | 1 | Parallel Ollama pipelines | Yes |
| CPU group limit | 2 | Parallel CPU-group pipelines | Yes |
| I/O group limit | 2 | Parallel I/O-group pipelines | Yes |

GPU picker max visible GPU limit in the number field is 4; Ollama 4; CPU/I/O 8.

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| `aiInferencePreferredGpuId` | `media-settings.json` | Which adapter row was chosen |
| `pipelineConcurrency` | same | Group limits |

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Windows WMI / PowerShell | Adapter names | Auto only |
| DirectML / ONNX runtime | Actually using the GPU | Work falls back to whatever the runtime picks; no Settings error |
| Ollama running | Ollama group jobs | Analysis/search translation fail in those features, not on this card |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `media:get-ai-inference-gpu-options` | — | List Auto + detected adapters |
| `media:save-settings` (`aiInferencePreferredGpuId`, `pipelineConcurrency`) | full settings | Persist and apply GPU env + scheduler limits |

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| Machine integration | `apps/desktop-media/electron/native-face/native-face-gpu.machine.integration.test.ts` | GPU path when the machine has it (not CI-default) |

**Coverage gaps:** no unit test of `detectAiInferenceGpuOptions`; no E2E that the GPU card
lists adapters; concurrency card untested in Playwright.

## 13. Known limitations & open questions

- **Limitation:** the in-app picker cannot override Windows GPU scheduling by itself.
- **Limitation:** adapter detection is Windows-only.
- **Open question:** whether pipeline concurrency should move fully under M-09 docs once they
  exist, leaving this feature as GPU selection only.

## 14. References

- Module: [Settings & Configuration](README.md)
- [Settings ownership index](02-settings-ownership-index.md) (F-09-01)
- [Local AI runtime](../13-platform-and-distribution/03-local-ai-runtime.md)
