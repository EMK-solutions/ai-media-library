---
id: F-12-03
module: 12-onboarding-and-help
title: AI models & licenses
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/onboarding/ai-models-reference-sheet.tsx
  - apps/desktop-media/src/renderer/components/onboarding/ai-models-reference-data.ts
related:
  - F-12-01
  - F-13-03
  - F-13-04
  - F-03-02
---

# AI models & licenses

> Open a short table of which model families the app uses and a link to each vendor’s license
> page — without treating that table as legal advice.

## 1. Summary

The application is MIT-licensed; the weights it downloads or that Ollama runs are not. The
**AI models and licenses** sheet is a transparency overlay: purpose, model/family, license
URL. Copy on the sheet says it is a short reference and that the user should verify vendor
pages before production use. Installed Ollama ids are chosen in Settings, not in this table.

The same sheet opens from the welcome deck (**Models list**), from Settings (**AI models &
licenses**), and from People help when a slide action requests it.

## 2. User stories

- **As a privacy- or license-conscious user** I want vendor links in the app,
  **so that** I do not have to reverse-engineer which YOLO or Qwen variant we ship.
- **As a new user** I want this from the welcome “Software and AI models” slide,
  **so that** licenses appear before the first big download.
- This is **not** a model picker and **not** a substitute for reading the linked licenses.

## 3. Scope

**In scope**

- Overlay table and entry points
- Curated rows currently shipped in `AI_MODEL_REFERENCE_ROWS`

**Out of scope**

- Downloading or selecting models — [Local AI runtime](../13-platform-and-distribution/03-local-ai-runtime.md),
  [Analysis prompts & models](../03-ai-image-analysis/02-analysis-prompts-and-models.md)
- End-user install notes — `docs/END-USER-GUIDE/install.md`

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Welcome slide that links here | [First-run welcome](01-first-run-welcome.md) |
| Offline / local processing stance | [Privacy & offline](../13-platform-and-distribution/04-privacy-and-offline.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-12-03.1 | Reference sheet | Modal table, close, backdrop click | shipped |
| F-12-03.2 | Curated catalog | Bundled/ONNX rows then Ollama-hosted rows | shipped |

## 5. User journeys

### J-12-03-1 — Open from Settings

**Trigger:** Settings → **AI models & licenses**.

1. Sheet **AI models and licenses** opens over Settings.
2. The user follows a license URL in the system browser.
3. Close (X, backdrop) returns to Settings.

**Outcome:** no settings change.

### J-12-03-2 — Open from welcome

**Trigger:** **Models list** on the licenses slide.

**Outcome:** sheet stacks above the welcome modal; closing the sheet leaves welcome open.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| AI models and licenses | Settings, welcome, People help action | Purpose / Model / License columns | `ai-models-reference-sheet.tsx` |

**Shipped rows** (purpose → family; URLs in `ai-models-reference-data.ts`):

| Purpose | Model / family |
|---|---|
| Face detection | YOLO variants or RetinaFace |
| Face landmarks | ONNX landmark model (e.g. PFLD-style) |
| Image rotation detection | ONNX orientation classifier |
| Age and gender detection | ONNX age/gender estimator |
| Semantic / vision embeddings | Nomic embed family |
| AI image analysis (via Ollama) | User-selected (e.g. Qwen3.5 vision) |
| Search prompt translation (via Ollama) | User-selected (e.g. Qwen2.5) |

**States**

| State | What the user sees |
|---|---|
| Closed | Nothing |
| Open | Dimmed backdrop, scrollable table |

**UX notes**

- Disclaimer: verify each vendor page; Settings chooses installed model ids.
- Links use `target="_blank"` with `noopener`.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | The sheet does not enable, disable or download models. | Avoid implying that opening Help installed weights. | `ai-models-reference-sheet.tsx` |
| BR-2 | Rows are a curated list, not a live query of `ollama list` or the models folder. | Settings can name ids that are not installed; this table stays educational. | `ai-models-reference-data.ts` |
| BR-3 | Welcome and Settings use the same component and data. | One list to update when a family ships. | both entry points |

## 8. Settings & defaults

None — this feature exposes no user settings.

## 9. Data & persistence

None. The table is compile-time data.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Network / browser | Opening a license URL | Link does nothing useful offline |
| Accurate vendor URLs | Trust | Stale URL → 404; sheet still lists the purpose |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `handleGuidedSlideDeckAction` (`open-ai-models-reference`) | action id | Parent opens the sheet |

No IPC.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| Unit | `product-welcome-content.test.ts` / `guided-slide-catalog.test.ts` | Welcome includes licenses slide id |

**Coverage gaps:** no component test that the sheet renders all rows or that Settings opens it.

## 13. Known limitations & open questions

- **Limitation:** families are named loosely (“YOLO variants or RetinaFace”); the exact
  default detector id lives in Face detection settings.
- **Limitation:** commercial-use restrictions are mentioned in welcome copy, not per-row.
- **Open question:** whether the table should list approximate download sizes like the Face
  detection dropdowns already do.

## 14. References

- Module: [Onboarding & Help](README.md)
- `docs/END-USER-GUIDE/install.md` (AI model license note)
- `docs/limitations-and-transparency.md`
- [Local AI runtime](../13-platform-and-distribution/03-local-ai-runtime.md)
