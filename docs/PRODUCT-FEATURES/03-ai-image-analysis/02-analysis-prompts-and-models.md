---
id: F-03-02
module: 03-ai-image-analysis
title: Analysis prompts & models
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/shared/photo-analysis-prompt.ts
  - apps/desktop-media/electron/photo-analysis.ts
  - apps/desktop-media/electron/photo-analysis-parser.ts
  - apps/desktop-media/electron/ollama-model-resolve.ts
  - apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx
related:
  - F-03-01
  - F-03-04
  - F-03-05
---

# Analysis prompts & models

> See exactly what the app asks the AI about each image, and choose which local model answers.

## 1. Summary

Everything the AI knows about a photo comes from one instruction the app sends alongside the
image. That instruction is fixed, versioned and visible: Settings shows the full text of both the
photo-analysis prompt and the invoice-extraction prompt, read-only, together with their version
numbers. Users cannot edit them, but they can read them, which is what makes the resulting
descriptions and categories explainable rather than magic.

What the user can change is the model. The app talks to a locally running Ollama service and
sends each image to whichever vision model id is configured. Two presets are recommended in the
product — a larger, more accurate one and a lighter, faster one — but the field accepts any model
id the user has pulled. A separate reference sheet lists every AI model the product uses and
where its licence lives.

## 2. User stories

- **As a privacy-minded user** I want to read the exact question the app asks about my photos,
  **so that** I know nothing beyond image analysis is happening.
- **As someone on a modest machine** I want to switch to a smaller model, **so that** analysis
  finishes in reasonable time and fits in my graphics memory.
- **As someone comparing results** I want to re-run a folder with a different model, **so that**
  I can judge which one describes my photos better.
- **As a user checking licences** I want to see which models the product uses, **so that** I can
  confirm what is running on my machine.

## 3. Scope

**In scope**

- The read-only text and version of the photo-analysis prompt and the invoice-extraction prompt
- The list of fields the model is asked to fill in and the allowed values for each
- Choosing the vision model, and what happens when the chosen model is not installed
- The AI models and licences reference sheet
- The fixed generation settings that make repeated runs consistent

**Out of scope**

- Running the analysis itself — see [AI image analysis](01-ai-image-analysis.md)
- What the app does with the returned edit suggestions — see
  [Image edit suggestions](04-image-edit-suggestions.md)
- The models used for face detection, embeddings and orientation — those belong to
  [People & Faces](../04-people-and-faces/README.md),
  [Search & Discovery](../05-search-and-discovery/README.md) and
  [Wrong rotation detection](03-wrong-rotation-detection.md)

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-03-02.1 | Read-only photo prompt | The full analysis instruction with its version, expandable in Settings | shipped |
| F-03-02.2 | Read-only invoice prompt | The full invoice instruction with its version | shipped |
| F-03-02.3 | Vision model selection | A free-text model id, with two documented presets | shipped |
| F-03-02.4 | Installed-model check | A clear failure naming the missing model before a long run starts | shipped |
| F-03-02.5 | AI models & licences sheet | A table of every model the product uses, purpose and licence link | shipped |
| F-03-02.6 | Deterministic generation settings | The same image analysed twice tends to give the same answer | shipped |

## 5. What the model is asked for

The photo-analysis prompt (version `web-main-3.1`) asks for a single JSON object with these
fields. All of them may be null when the model cannot tell.

| Field the user sees | What the model returns | Allowed values / limits |
|---|---|---|
| Category | One main image category | `document_contract`, `document_other`, `document_id_or_passport`, `invoice_or_receipt`, `screenshot`, `presentation_slide`, `diagram`, `person_or_people`, `nature`, `humor`, `food`, `pet`, `sports`, `architecture`, `other` |
| Title | A short headline for the image | Maximum 50 characters |
| Description | A detailed description covering subjects, clothing and colours, objects, setting, spatial relationships, lighting and mood | Maximum 1500 characters |
| People detected | How many people are in the image | A number, or null |
| Has child or children | Whether a child is present | True, false, or null when uncertain |
| People details | Up to five representative people, each with category (adult, child, baby, unknown), gender and average age | At most 5 entries, never one per person in a crowd |
| Place | Country and city | Null when not identifiable |
| Date and time | When the photo appears to have been taken | `YYYY-MM-DD` and `HH:MM`, or null |
| Weather, time of day | Conditions in the scene | Weather free text; time of day one of morning, day, evening, night |
| Aesthetic quality | A professional-photographer quality score | 1 (worst) to 10 (best) |
| Low quality | Whether the image is clearly poor | True, false, or null |
| Quality issues | Named problems | `blur`, `out_of_focus`, `motion_blur`, `overexposed`, `underexposed`, `high_noise`, `compression_artifacts`, `poor_framing`, `tilted_horizon`, `none` |
| Edit suggestions | Concrete improvements with parameters | See [Image edit suggestions](04-image-edit-suggestions.md) |

The invoice prompt (version `invoice-data-1.0`) is a separate, much shorter instruction that asks
only for issuer, invoice number, invoice date, client number, total amount, currency, VAT percent
and VAT amount, with an explicit rule never to invent a value that is not visible on the
document. It is described in
[Invoice & receipt extraction](05-invoice-and-receipt-extraction.md).

Both prompts forbid markdown, code fences and commentary, and require the answer to be JSON only.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Settings → AI image analysis → **AI model** | Settings, advanced settings shown | Text field for the model id, plus a "?" that reveals what the choice means, that the field is not live-checked against Ollama, and a note about planned improvements | `apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx` |
| Settings → **Prompt used (version web-main-3.1)** | Same section, collapsed by default | The complete photo-analysis prompt in a scrollable, read-only block | Same |
| Settings → **Invoice extraction prompt (version invoice-data-1.0)** | Same section, collapsed by default | The complete invoice prompt, read-only | Same |
| **AI models & licenses** sheet | Button at the top of Settings, and from the welcome and People help decks | Purpose, model name or family, and a licence link for each model the product uses | `apps/desktop-media/src/renderer/components/onboarding/ai-models-reference-sheet.tsx` |

**UX notes**

- Both prompt blocks and the model field only appear when advanced settings are shown; a user who
  has hidden advanced settings sees neither.
- The prompt panels are collapsed until clicked, so the settings page stays readable.
- The models reference sheet is shared with onboarding, so the same table is reachable from the
  welcome tour and from the People screen's help.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Prompts are shipped constants and cannot be edited from the app. | Results stay comparable across a library and across users. | `apps/desktop-media/src/shared/photo-analysis-prompt.ts` |
| BR-2 | Each prompt carries a version string that is shown next to the prompt in Settings. The model name is stored with every result; the prompt version is not. | The version is a product-facing label; only the model is needed to interpret a stored result. | `apps/desktop-media/src/shared/photo-analysis-prompt.ts`, `apps/desktop-media/electron/db/media-analysis.ts` |
| BR-3 | The model id is a free-text field with two documented presets; any Ollama vision model id is accepted. | Users experiment with models faster than the product can ship a list. | `apps/desktop-media/src/shared/photo-analysis-prompt.ts`, `DesktopSettingsSection.tsx` |
| BR-4 | Before a run, the app asks Ollama which models are installed and fails immediately if the configured one is missing, naming up to eight installed models in the message. | A typo should cost a second, not a whole batch. | `apps/desktop-media/electron/ollama-model-resolve.ts` |
| BR-5 | If Ollama cannot be reached at all, the message says so and names the address it tried. | Distinguishes "service is down" from "model is missing". | Same |
| BR-6 | Generation is pinned to temperature 0.15, seed 42, top-p 0.9 and top-k 40, and the response is requested in JSON mode. | Two runs of the same image should agree. | `apps/desktop-media/electron/photo-analysis.ts` |
| BR-7 | Step-by-step "thinking" is only offered for models known to support it, and is off in the shipped app. | Thinking output would slow analysis without changing the stored fields. | `apps/desktop-media/src/shared/photo-analysis-prompt.ts` |
| BR-8 | Answers wrapped in code fences, or with text around the JSON, are still parsed by extracting the JSON object. | Small models do not always obey the "JSON only" rule. | `apps/desktop-media/electron/photo-analysis-parser.ts` |
| BR-9 | The app connects to Ollama at `http://127.0.0.1:11434` unless an environment variable overrides the address. | Local by default, overridable for advanced setups. | `apps/desktop-media/electron/photo-analysis.ts` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| AI model | `qwen3.5:9b` | Which Ollama model receives the images | Yes |
| Prompt used | Read-only, version `web-main-3.1` | The instruction sent with every image | Yes |
| Invoice extraction prompt | Read-only, version `invoice-data-1.0` | The instruction sent for bills | Yes |

Presets offered by the product:

| Model id | Label in the product | Step-by-step thinking |
|---|---|---|
| `qwen3.5:9b` | Qwen 3.5 9B (recommended default) | Supported |
| `qwen2.5vl:3b` | Qwen 2.5 VL 3B (lighter / faster) | Not supported |

The Ollama address defaults to `http://127.0.0.1:11434` and is not exposed in the interface; it
can only be changed through an environment variable before the app starts.

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Model id, per-image timeout, downscale settings | Stored settings | Applied to every subsequent run |
| The model that produced a result | `media_items.ai_metadata` (analysis method) | Lets a user tell which model described an image |
| Prompt text and version | Compiled into the app | Change only with a product update |

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Ollama reachable at the configured address | Listing installed models and analysing | "Cannot reach Ollama to verify model …" naming the address |
| The chosen model pulled locally | Analysing | A message naming the missing model and listing installed ones |
| Advanced settings visible | Reading the prompts and changing the model | The controls are simply absent |

## 11. Automatable actions & API surface

| Action | Parameters | Intent |
|---|---|---|
| Photo analysis settings update | `model` | Change which model future runs use |
| `assertOllamaModelInstalled` | model id | Fail fast before a long batch |
| `supportsThinkingMode` | model id | Decide whether thinking can be requested |

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| Unit | `apps/desktop-media/electron/ollama-model-resolve.test.ts` | Matching a model id against the installed list, the missing-model error, and the unreachable-service error |
| E2E | `apps/desktop-media/tests/e2e/photo-analysis-downscale-settings.spec.ts` | The shipped defaults of the analysis settings group, and a changed setting reaching the request |

**Coverage gaps:** nothing verifies that the prompt text or version is rendered in Settings, and
the parser that tolerates fenced or padded JSON has no test of its own.

## 13. Known limitations & open questions

- **Limitation:** prompts cannot be edited or extended by the user, so a library with unusual
  content cannot bias the categories towards its own vocabulary.
- **Limitation:** the model field is validated only when a run starts. The settings help text
  names a "Test model" action as a possible improvement, but it does not exist today.
- **Limitation:** changing the model does not invalidate existing results, so a library can end
  up with descriptions written by two different models unless the user re-runs with
  **Override existing**.
- **Limitation:** the prompt asks for more than the product keeps. Time of day is requested but
  discarded when the result is stored, and weather and per-person gender and age details are
  stored without being shown anywhere in the interface.
- **Limitation:** the prompt version is displayed but not saved against results, so after a
  prompt change there is no way to tell which images were described by the older wording.

## 14. References

- Module: [AI Image Analysis](README.md)
- [AI image analysis](01-ai-image-analysis.md) — the run that uses these prompts
- [Invoice & receipt extraction](05-invoice-and-receipt-extraction.md) — the second prompt
- [Platform & distribution](../13-platform-and-distribution/README.md) — installing Ollama and models
