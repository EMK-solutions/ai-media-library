---
id: M-07
title: Documents
status: shipped
last_reviewed: 2026-08-26
---

# Module 07 — Documents

> The paperwork hiding in a photo library, pulled out into a table you can filter — starting with
> invoices and receipts.

## 1. Purpose & value

Most photo libraries are also, accidentally, filing cabinets. A receipt photographed at a till, a
scanned utility bill, a picture of an invoice taken so the paper could be thrown away — they all
end up mixed in with holiday photos, findable only by remembering roughly when they were filed.

This module is the place where that paperwork becomes usable. Once
[AI image analysis](../03-ai-image-analysis/README.md) has recognised an image as an invoice or
receipt and read its issuer, date, total and VAT, the Documents section presents those images not
as thumbnails but as rows: issuer, date, total, VAT, one line each, filterable by who issued it,
when, for how much and in which currency. Clicking a row opens the original photo, because the
photo is still the source of truth and the extracted numbers are a convenience.

Documents is deliberately a consumption module. It reads what the analysis pipeline wrote; it does
not itself look at any image.

## 2. User stories

- **As someone who photographs receipts** I want a list of every bill in my library with its
  amount, **so that** I can find a purchase without scrolling through photos.
- **As a household administrator** I want to filter by who issued a bill and when, **so that** I
  can pull up one specific document in seconds.
- **As a careful user** I want to be warned when the extracted numbers do not add up, **so that**
  I do not trust a misread total.
- **As a new user** I want to understand what this screen will look like once analysis has run,
  **so that** I know whether it is worth the wait.

## 3. Feature index

| ID | Feature | Status | Primary screen | Doc |
|---|---|---|---|---|
| F-07-01 | Invoices & receipts | shipped | Documents → Invoices & Receipts | [01-invoices-and-receipts.md](01-invoices-and-receipts.md) |

## 4. Key journeys

| ID | Journey | Path through the product |
|---|---|---|
| J-07-1 | See what the feature does before using it | Sidebar → Documents → Invoices & Receipts → the help wizard opens on first visit, over a sample table |
| J-07-2 | Fill the table | Run [AI image analysis](../03-ai-image-analysis/01-ai-image-analysis.md) with **Extract invoice data** on → return to the workspace |
| J-07-3 | Find one bill | Open the filter panel → type part of the issuer, a date range, an amount range or a currency |
| J-07-4 | Check a suspicious figure | Spot the amber warning on a row → click the row to open the original photo and compare |

Cross-module flows, including where analysis sits in the recommended setup order, are in
[`../JOURNEYS.md`](../JOURNEYS.md).

## 5. Entry points & navigation

| Entry point | Leads to | Notes |
|---|---|---|
| Sidebar → **Documents** → **Invoices & Receipts** | The invoices and receipts workspace | The only entry point today; Documents has one child row |
| The help control in the workspace header | The Invoices & Receipts help wizard | Opens by itself on the first visit |
| A table row | The original image in the viewer | Sample rows are not clickable |
| The filter control in the workspace header | The filter panel | Carries a badge with the number of active filters |

## 6. Key concepts

| Term | Meaning in this module |
|---|---|
| Document | An image the AI categorised as an invoice or receipt |
| Issuer | The company that issued the bill, as read off the paper |
| Total | The total amount, shown with its currency when one was read |
| VAT | The VAT percentage, with the VAT amount in brackets when both were read |
| Consistency hint | An amber marker on a row whose numbers do not agree with each other |
| Sample table | The example rows shown when the library contains no real documents yet |

Full definitions: [`../GLOSSARY.md`](../GLOSSARY.md).

## 7. Dependencies

**Depends on**

| Module | What it needs |
|---|---|
| [M-03 AI Image Analysis](../03-ai-image-analysis/README.md) | The invoice-or-receipt category and the extracted fields; without a run, this module has nothing to show |
| [M-02 Catalog & Metadata](../02-catalog-and-metadata/README.md) | The catalog row, file path and media kind behind each table row |
| [M-01 Library Browsing & Media Viewer](../01-library-browsing-and-media-viewer/README.md) | The viewer that opens when a row is clicked |
| [M-12 Onboarding & Help](../12-onboarding-and-help/README.md) | The help wizard and the record of whether the user has dismissed it |

**Depended on by**

Nothing else in the product reads from this module; it is a leaf.

## 8. Settings owned

This module owns no settings. What appears in it is governed by **Extract invoice data** and the
AI model choice, both owned by
[M-03](../03-ai-image-analysis/05-invoice-and-receipt-extraction.md) and shown on the settings
screen described in [M-11](../11-settings-and-configuration/README.md).

## 9. Quality snapshot

| Type | Coverage |
|---|---|
| E2E | `apps/desktop-media/tests/e2e/sidebar-navigation.spec.ts` — navigating to Documents → Invoices & Receipts shows the sample table and its explanatory banner when the library has no documents |
| Unit | `apps/desktop-media/electron/db/invoice-receipt-documents.test.ts` — counting only invoice-or-receipt items, issuer filtering, paging, currency filtering, partial-year date filtering, and reading fields from the current and older storage shapes |
| Unit | `apps/desktop-media/src/renderer/actions/document-actions.test.ts` — the count and list actions delegate correctly |
| Unit | `apps/desktop-media/src/renderer/lib/invoice-receipt-amount-warnings.test.ts`, `invoice-receipt-cell-format.test.ts`, `invoice-receipt-date-query.test.ts`, `invoice-receipt-date-draft.test.ts`, `invoice-receipt-filter-count.test.ts` — amount and VAT formatting, the consistency checks, date normalisation and the active-filter count |

**Gaps:** the workspace component itself — filter debouncing, paging, the sample-mode switch and
the thumbnail toggle — has no component test.

## 10. Known gaps & direction

- The module has exactly one document type. IDs, contracts and other paperwork are recognised by
  analysis as separate categories but have no workspace of their own.
- Extracted values cannot be corrected by hand, so a misread total stays wrong until the image is
  re-analysed.
- There is no export. The table cannot be saved to a spreadsheet or accounting tool.
- The table always sorts newest first by document date; column sorting is not available.
- Documents are not grouped or reconciled, so the same bill photographed twice appears twice.
