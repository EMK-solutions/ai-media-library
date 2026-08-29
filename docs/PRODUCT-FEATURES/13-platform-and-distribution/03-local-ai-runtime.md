---
id: F-13-03
module: 13-platform-and-distribution
title: Local AI runtime
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/electron/native-face/model-manager.ts
  - apps/desktop-media/electron/main.ts
  - apps/desktop-media/electron/ollama-model-resolve.ts
  - apps/desktop-media/electron/photo-analysis.ts
related:
  - F-04-01
  - F-03-01
  - F-11-04
  - F-12-03
  - F-13-04
---

# Local AI runtime

> Run vision, faces and search on this computer: download bundled ONNX / embedding weights
> into the app’s models folder, and talk to Ollama on localhost for large language/vision
> models the user installed separately.

## 1. Summary

Two stacks sit under “local AI”. **On-device models** (face detectors, landmarks, orientation,
age/gender, embeddings) are files the app downloads on first use or at startup
(`ensureActiveModels`) into `%APPDATA%/AI Media Library/ai-models`. Progress and failures
show in **Background operations** (`face-model-download-progress`). **Ollama** is a separate
program. The app does not bundle it; it calls `http://127.0.0.1:11434` (overridable with
`EMK_OLLAMA_BASE_URL` / `EMK_OLLAMA_URL`) for image analysis, invoice extraction, search
prompt translation and optional path-LLM. Turning on GPS place names downloads about **2 GB**
of GeoNames data into the runtime `geonames` folder.

## 2. User stories

- **As a new user** I want face models to appear without a manual wget,
  **so that** Face detection can start after install.
- **As someone who wants descriptions** I want a documented Ollama install,
  **so that** I know analysis will not work until that service is running.
- **As someone on a metered connection** I want download failures visible in Background
  operations, **so that** I can retry instead of assuming the pipeline is broken.

## 3. Scope

**In scope**

- ONNX / Hugging Face weight download and `ensureActiveModels`
- Ollama as an external HTTP runtime (default URL, env override, not bundled)
- GeoNames download size as a runtime dependency of location detection
- Failure surfacing for face/aux models

**Out of scope**

- Choosing analysis model ids — [F-03-02](../03-ai-image-analysis/02-analysis-prompts-and-models.md)
- GPU adapter — [F-11-03](../11-settings-and-configuration/03-gpu-and-inference.md)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| License table | [AI models & licenses](../12-onboarding-and-help/03-ai-models-and-licenses.md) |
| Path display | [App data locations](../11-settings-and-configuration/04-app-data-locations.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-13-03.1 | On-device model provision | Download to `ai-models`, progress in the dock | shipped |
| F-13-03.2 | Ollama connection | Local HTTP API, default port 11434 | shipped |
| F-13-03.3 | GeoNames runtime data | ~2 GB on first GPS enable | shipped |

## 5. User journeys

### J-13-03-1 — Face models on first need

**Trigger:** app start (`ensureActiveModels`) or first Face detection / model switch.
**Preconditions:** network for the first download.

1. Weights are fetched from configured URLs (Hugging Face / GitHub releases).
2. **Background operations** shows **AI model download - Face detection** (or aux names).
3. Jobs that need the file wait until it is present.

**Outcome:** detector/embedder files sit under `ai-models/onnx` (and related paths).

**Failure paths**

- Download fails → dock shows e.g. “Failed to download face detector model (yolov12m-face).”
  (E2E with `e2eFailFaceModelDownload`).

### J-13-03-2 — Enable Ollama-backed analysis

**Trigger:** user wants Image AI analysis.
**Preconditions:** Ollama installed and a vision model pulled.

1. Install Ollama from ollama.com; run `ollama serve` or the tray app.
2. `ollama pull` the id chosen in Settings (defaults include `qwen3.5:9b` for analysis).
3. Run analysis; the app posts to `127.0.0.1:11434`.

**Failure paths**

- Ollama not running → analysis requests fail; Settings does not live-check `/api/tags`.

### J-13-03-3 — First GPS place-name enable

**Trigger:** Settings → GPS detection on.

1. Confirm download (~2 GB) or use a local copy if present.
2. Data lands in the GeoNames runtime folder.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Background operations download card | First model fetch / failure | Title, error line | `FaceModelDownloadCard.tsx` |
| Welcome Ollama slide | First-run deck | Link to ollama.com/download | `guided-slide-catalog.ts` |
| Settings GPS confirm | Enable location detection | ~2 GB copy | `DesktopSettingsSection.tsx` |

**States**

| State | What the user sees |
|---|---|
| Downloading | Dock progress |
| Failed | Dock error; pipelines that need the file cannot run |
| Ollama missing | Analysis/search-translation errors at run time |

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Core embedder and the selected detector are ensured via `ensureActiveModels`. | Face features must not start with empty weights. | `model-manager.ts`, `main.ts` |
| BR-2 | Aux models (orientation, landmarks, age-gender) download when enabled or first used; failures use the same progress channel. | One dock UX for all ONNX fetches. | `ipc.ts` `faceModelDownloadProgress`, Settings `ensureAuxModel` |
| BR-3 | Ollama base URL defaults to `http://127.0.0.1:11434`; `EMK_OLLAMA_BASE_URL` or `EMK_OLLAMA_URL` override. | Local by default; testers can point at another host. | `photo-analysis.ts`, `ollama-model-resolve.ts` |
| BR-4 | Ollama is not shipped inside the installer. | Size and license; the user installs it from ollama.com. | `docs/END-USER-GUIDE/install.md` |
| BR-5 | GeoNames is off until the user confirms a ~2 GB download (or local copy). | Avoid surprise disk and bandwidth use. | `DEFAULT_FOLDER_SCANNING_SETTINGS.detectLocationFromGps` false |

## 8. Settings & defaults

No dedicated “runtime” card. Related defaults:

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| Detect Country / City from GPS… | Off | Triggers GeoNames provision | No |
| Face detection model (etc.) | See F-04-01 | Which ONNX file to ensure | Yes |

Ollama URL is **not** in Settings.

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| ONNX / HF weights | Runtime `ai-models/` | Re-downloadable |
| GeoNames | Runtime `geonames/` | ~2 GB; place names |
| Pulled Ollama models | Ollama’s own directory | Outside this app |

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Network | First model / GeoNames fetch | Dock or GPS confirm failure |
| Disk space | GeoNames ~2 GB, large ONNX files | Download fail |
| Ollama process | Analysis, translation, path LLM | Pipeline errors |
| Hugging Face / GitHub | Weight URLs | Same as network failure |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `ensureDetectorModel` / `ensureAuxModel` | model id / kind | Download if missing |
| `media:face-model-download-progress` | push | Progress and errors |
| (internal) `ensureActiveModels` | detector id | Startup provision |

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/face-model-download-failure.spec.ts` | Detector and aux failures appear in Background operations |

**Coverage gaps:** no E2E that Ollama is required for analysis (would need a running service);
GeoNames download not automated.

## 13. Known limitations & open questions

- **Limitation:** Settings analysis model dropdown is not checked against `ollama list`.
- **Limitation:** `docs/limitations-and-transparency.md` says model selection is “fixed in
  code for most pipelines”; analysis and search translation **are** user-editable — that
  sentence is partly stale.
- **Open question:** in-Settings “Test Ollama” (mentioned as a possible improvement in
  analysis Settings copy) is not built.

## 14. References

- Module: [Platform & Distribution](README.md)
- [Face detection](../04-people-and-faces/01-face-detection.md)
- `docs/limitations-and-transparency.md`
