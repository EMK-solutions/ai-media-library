---
id: F-03-05
module: 03-ai-image-analysis
title: Invoice & receipt extraction
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/electron/photo-analysis-pipeline.ts
  - apps/desktop-media/electron/photo-analysis.ts
  - apps/desktop-media/src/shared/photo-analysis-prompt.ts
  - apps/desktop-media/src/renderer/components/DesktopViewerInfoPanel.tsx
related:
  - F-03-01
  - F-03-02
  - F-07-01
---

# Invoice & receipt extraction

> When a photo turns out to be a bill, read the issuer, date, total and VAT off it and store them
> as proper fields.

## 1. Summary

Photo libraries collect paperwork. A receipt snapped in a restaurant, a scanned utility bill, a
phone picture of an invoice — they sit among holiday photos with nothing to distinguish them but
a thumbnail. This feature is the second half of an analysis pass: as soon as the vision model
categorises an image as an invoice or receipt, the app sends that same image back to the model
with a short, purpose-built instruction that asks only for the numbers on the paper.

What comes back is eight fields: who issued it, its number, its date, the client number, the
total, the currency, the VAT percentage and the VAT amount. Those fields appear in the photo info
panel next to the image, and they are what makes the
[Invoices & Receipts workspace](../07-documents/01-invoices-and-receipts.md) possible — a
searchable, filterable table of every bill in the library. This document covers the extraction;
the workspace that consumes it is documented in [Documents](../07-documents/README.md).

## 2. User stories

- **As someone who photographs receipts** I want the amount and the date read automatically,
  **so that** I can find a purchase without opening every picture.
- **As a household administrator** I want bills recognised wherever they are filed, **so that**
  I do not have to keep them in a separate folder.
- **As a user with mixed content** I want the extra work to happen only on paperwork,
  **so that** analysing a folder of holiday photos is not slowed down by it.
- **As a privacy-minded user** I want the reading done on my own machine, **so that** financial
  documents never leave it.

## 3. Scope

**In scope**

- Deciding when the second pass runs
- The eight fields that are read, and how they are validated
- Where the fields appear next to the image
- The setting that turns the feature off
- What happens when the second pass fails

**Out of scope**

- Deciding that an image is a bill in the first place — that is the category from
  [AI image analysis](01-ai-image-analysis.md)
- The exact prompt text — see [Analysis prompts & models](02-analysis-prompts-and-models.md)
- Browsing, filtering, sorting or exporting the extracted data — see
  [Invoices & receipts](../07-documents/01-invoices-and-receipts.md)

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-03-05.1 | Automatic second pass | Bills are read without the user doing anything beyond running analysis | shipped |
| F-03-05.2 | Eight structured fields | Issuer, number, date, client number, total, currency, VAT percent and VAT amount | shipped |
| F-03-05.3 | Fields in the info panel | An **Invoice / receipt data** section beside the image, shown only for bills | shipped |
| F-03-05.4 | Opt-out setting | A single switch to skip the extra pass entirely | shipped |
| F-03-05.5 | Non-blocking failure | A bill whose fields cannot be read still keeps its description and category | shipped |

## 5. User journeys

### J-03-05-1 — Bills are read while a folder is analysed

**Trigger:** the user runs [AI image analysis](01-ai-image-analysis.md) on a folder that contains
photographed paperwork.
**Preconditions:** **Extract invoice data** is on, which it is by default.

1. Each image is described as usual.
2. When the model answers with the invoice-or-receipt category, the app immediately sends the
   same image again with the invoice instruction.
3. The returned fields are stored alongside the description.
4. Opening that image in the viewer shows an **Invoice / receipt data** section listing the
   fields that were found.
5. The Documents entry in the sidebar now leads to a table containing that bill.

**Outcome:** paperwork in the library becomes searchable by issuer, date and amount.

**Alternate paths**

- The image is not a bill → no second pass, no extra time spent.
- Only some fields are legible → the readable ones are stored and the rest stay empty; the prompt
  explicitly forbids guessing.

**Failure paths**

- The second pass fails or returns something unusable → the image keeps its description and
  category, and simply has no invoice fields. Nothing is marked as failed.

### J-03-05-2 — Turn the extra pass off

**Trigger:** a user who has no paperwork in their library, or who wants analysis to run as fast as
possible.

1. Settings → **AI image analysis** → clear **Extract invoice data**.
2. Later runs skip the second pass entirely, even for images categorised as bills.

**Outcome:** analysis is slightly faster and the Documents table stops gaining new rows.

**Alternate paths**

- Turning it back on does not retroactively read older bills; the user must re-run analysis with
  **Override existing** on the folders concerned.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| **Invoice / receipt data** section | Open a bill in the viewer → Info tab | Invoice issuer, Invoice number, Invoice date, Client number, Invoice total amount, Invoice total amount currency, VAT %, VAT amount | `apps/desktop-media/src/renderer/components/DesktopViewerInfoPanel.tsx` |
| Settings → **Extract invoice data** | Settings → AI image analysis | A single switch, with a description explaining the second prompt | `apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx` |
| **Invoice extraction prompt** | Settings, advanced settings shown | The full instruction, read-only, with its version | Same |

**UX notes**

- The invoice section only appears when at least one of the fields has a value, so ordinary photos
  never show an empty financial block.
- Unlike the model setting, this switch is visible even when advanced settings are hidden, because
  it changes how long analysis takes.
- There is no separate progress indicator for the second pass; it is part of the same per-image
  step in the analysis card.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | The second pass runs only when the switch is on and the model categorised the image as an invoice or receipt. | Reading numbers off a landscape photo would waste time and produce noise. | `apps/desktop-media/electron/photo-analysis-pipeline.ts` |
| BR-2 | The second pass uses the same model, timeout and downscaling as the first. | One configuration for the whole analysis. | Same |
| BR-3 | The second pass runs after any orientation handling, so the image is read the right way up. | Sideways text cannot be read reliably. | Same |
| BR-4 | Text fields are trimmed and empty strings become empty; numeric fields must be finite numbers or they are discarded. | Prevents "N/A" and similar text landing in a total column. | `apps/desktop-media/electron/photo-analysis.ts` |
| BR-5 | A failure in the second pass never fails the image. The description and category are kept. | Losing a good description because a total was unreadable would be a bad trade. | `apps/desktop-media/electron/photo-analysis-pipeline.ts` |
| BR-6 | The model is told never to invent a value that is not visible on the document. | An invented total is worse than a missing one. | `apps/desktop-media/src/shared/photo-analysis-prompt.ts` |
| BR-7 | Dates are requested in year-month-day form and the currency as a three-letter code. | Makes date-range and currency filters possible in the Documents workspace. | Same |
| BR-8 | Re-analysing an image replaces its invoice fields with the new reading. | The latest pass is the current truth. | `apps/desktop-media/electron/db/media-analysis.ts` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| Extract invoice data | On | When an image is an invoice or receipt, run a second prompt to store issuer, invoice number and date, totals, currency and VAT as structured fields | No |
| Invoice extraction prompt | Read-only, version `invoice-data-1.0` | The instruction used for the second pass | Yes |

Defined in `apps/desktop-media/src/shared/ipc.ts` (`DEFAULT_PHOTO_ANALYSIS_SETTINGS`). The model
and per-image timeout are shared with [AI image analysis](01-ai-image-analysis.md).

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| The eight invoice fields | `media_items.ai_metadata` under document data | The **Invoice / receipt data** section and the Documents table |
| The invoice-or-receipt category | Same, under image analysis | What makes an item count as a document at all |

Older libraries may hold the same fields directly under the image-analysis entry or at the top
level of the metadata; the Documents workspace reads all three shapes so nothing is lost.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| [AI image analysis](01-ai-image-analysis.md) | The category that triggers the pass, and the run itself | No analysis means no invoice fields |
| Ollama with the chosen vision model | Reading the fields | The run fails before any image, as for ordinary analysis |
| A legible photo | Useful values | Empty fields rather than wrong ones |

## 11. Automatable actions & API surface

| Action | Parameters | Intent |
|---|---|---|
| Pipeline `photo-analysis` | `extractInvoiceData` | Turn the second pass on or off for one run, overriding the stored setting |
| Photo analysis settings update | `extractInvoiceData` | Change the default for future runs |

There is no way to run the invoice pass on its own; it is always part of an analysis run.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| Unit | `apps/desktop-media/electron/db/invoice-receipt-documents.test.ts` | Reading the stored fields from the document-data shape as well as the older shapes, and that only invoice-or-receipt items count |

**Coverage gaps:** the trigger condition, the field validation and the "failure does not fail the
image" rule have no dedicated tests, and no test exercises the invoice prompt against a model.

## 13. Known limitations & open questions

- **Limitation:** only single images are read. A multi-page invoice photographed as several files
  produces several unrelated rows.
- **Limitation:** line items, tax breakdowns and payment status are not extracted; only the eight
  header fields are.
- **Limitation:** the fields cannot be corrected by hand. If the model misreads a total, the only
  remedy is to re-run analysis.
- **Limitation:** turning the setting on later does not backfill bills that were analysed while it
  was off; those folders must be re-analysed with **Override existing**.
- **Limitation:** the date is whatever the model wrote. A bill using a day-month-year layout can
  be transcribed the wrong way round, and nothing detects that.
- **Open question:** the app does not record whether the second pass was attempted, so a bill with
  no fields could mean an unreadable document or a run made with the setting off.

## 14. References

- Module: [AI Image Analysis](README.md)
- [AI image analysis](01-ai-image-analysis.md) — the run this pass is part of
- [Analysis prompts & models](02-analysis-prompts-and-models.md) — the invoice instruction
- [Invoices & receipts](../07-documents/01-invoices-and-receipts.md) — the workspace that uses these fields
