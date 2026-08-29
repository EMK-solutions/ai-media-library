---
id: F-07-01
module: 07-documents
title: Invoices & receipts
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/documents/desktop-invoices-receipts-workspace.tsx
  - apps/desktop-media/src/renderer/components/documents/invoice-receipt-documents-table.tsx
  - apps/desktop-media/src/renderer/components/documents/invoice-receipt-filters-panel.tsx
  - apps/desktop-media/electron/db/invoice-receipt-documents.ts
  - apps/desktop-media/src/renderer/lib/invoice-receipt-amount-warnings.ts
related:
  - F-03-05
  - F-03-01
---

# Invoices & receipts

> Every bill in the library as a row of issuer, date, total and VAT — filterable, and one click
> away from the original photo.

## 1. Summary

The Invoices & Receipts workspace is a table view over one slice of the library: the images that
AI image analysis categorised as invoices or receipts. Each row shows a thumbnail, who issued the
document, its date, the total with its currency and the VAT percentage with its amount. A filter
panel above the table narrows the list by issuer, date range, amount range and currency, and every
row opens the original photo in the viewer.

Because the values were read by a model rather than typed by a person, the table also does a
little arithmetic of its own. When the VAT percentage and the VAT amount cannot be reconciled with
the total, or when an amount has an implausible number of decimal places, the cell carries an
amber marker so the user knows to check the paper.

A user who has not yet run analysis still sees something useful: the screen fills with clearly
labelled sample rows and a banner explaining that running AI image analysis will replace them with
real data.

## 2. User stories

- **As someone looking for a specific purchase** I want to filter by issuer and a date window,
  **so that** I can find the receipt in seconds.
- **As someone reviewing spending** I want every bill listed with its total, **so that** I can
  scan a period at a glance.
- **As a sceptical user** I want to be told when a figure looks wrong, **so that** I do not copy a
  misread number into a form.
- **As a first-time visitor** I want to understand what this screen becomes, **so that** I can
  decide whether to run the analysis it depends on.

## 3. Scope

**In scope**

- The table of invoice and receipt rows, its columns and its ordering
- Filtering by issuer, date range, total range and currency
- Paging through long lists
- The thumbnail column and the control to hide it
- The consistency hints on totals and VAT
- The sample table and banner shown to an empty library
- The help wizard for this screen

**Out of scope**

- Recognising a document and reading its fields — see
  [Invoice & receipt extraction](../03-ai-image-analysis/05-invoice-and-receipt-extraction.md)
- The viewer that opens when a row is clicked — see
  [Library Browsing & Media Viewer](../01-library-browsing-and-media-viewer/README.md)
- Any editing of the extracted values; this screen is read-only

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-07-01.1 | Documents table | One row per invoice or receipt with issuer, date, total and VAT | shipped |
| F-07-01.2 | Filter panel | Issuer, date from and to, total from and to, and currency, applied as the user types | shipped |
| F-07-01.3 | Paging | 48 rows per page with a pagination bar | shipped |
| F-07-01.4 | Thumbnail column | A preview per row, hideable to fit more rows on screen | shipped |
| F-07-01.5 | Consistency hints | Amber markers when VAT does not reconcile or an amount looks over-precise | shipped |
| F-07-01.6 | Open the original | Click a row to open the photo in the viewer | shipped |
| F-07-01.7 | Sample table | Example rows and an explanatory banner when no documents exist yet | shipped |
| F-07-01.8 | Help wizard | A three-step explanation, shown automatically on the first visit | shipped |

## 5. User journeys

### J-07-01-1 — First visit, before any analysis

**Trigger:** the user opens **Documents** in the sidebar and clicks **Invoices & Receipts**.
**Preconditions:** none; the workspace works on an empty library.

1. The help wizard opens by itself, explaining that image analysis detects documents, which
   fields it tries to extract, that the app checks for inconsistencies, and that the whole thing
   runs through Ollama on this machine with the model currently selected in Settings.
2. Behind it, the table is filled with sample rows, each with a **Sample** placeholder instead of
   a thumbnail, above the banner "Example only: sample rows show how this table will look. Run AI
   image analysis on your library to list real invoices and receipts here."
3. The filter control and the pagination bar are hidden, because there is nothing real to filter.
4. Closing the wizard records that the user has seen it; it does not open by itself again.

**Outcome:** the user knows what the screen becomes and what to run to get there.

### J-07-01-2 — Find a specific bill

**Trigger:** the library has been analysed and the user needs one document.
**Preconditions:** at least one image was categorised as an invoice or receipt.

1. The workspace opens with the filter panel already expanded and the newest documents first.
2. The user types part of the issuer's name; after a short pause the table narrows to matching
   rows and the page resets to the first.
3. They add a **Date from** of `2025` to limit it to that year, typing digits that are formatted
   into a year-month-day field as they go.
4. The filter control shows a badge with the number of active filters.
5. Clicking the matching row opens the original photo in the viewer.

**Outcome:** the document is found and can be read from the original.

**Alternate paths**

- The user enters a partial date such as `2025-06` → the range is widened to the whole month.
- The user types a currency → it is forced to three upper-case letters, and only exact matches
  are shown.
- The filters match nothing → the table reads "Nothing found for the current filters."
- The user hides thumbnails to fit more rows on screen.

**Failure paths**

- The document count cannot be read → the error "Could not load invoice data." appears and the
  screen falls back to the sample table.
- A page of rows cannot be loaded → "Could not load rows." appears and the table is emptied.

### J-07-01-3 — Question a figure

**Trigger:** a row shows an amber marker.

1. Next to the total, **Wrong?** means the amount has three or more decimal places, which rarely
   happens on a real bill.
2. Next to VAT, **Wrong** means the VAT percentage and amount cannot be reconciled with the total
   under any of the usual interpretations; **Wrong?** means the VAT amount itself is
   suspiciously precise.
3. The user clicks the row, reads the figure off the original photo, and decides.

**Outcome:** the user trusts the table where it is trustworthy and verifies where it is not.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Invoices & Receipts workspace | Sidebar → Documents → Invoices & Receipts | Title, help control, filter control with a badge, the table, the pagination bar | `apps/desktop-media/src/renderer/components/documents/desktop-invoices-receipts-workspace.tsx` |
| Filter panel | The filter control in the header | **Issued by**, **Date from**, **Date to**, **Total from**, **Total to**, **Currency**, and a close control | `apps/desktop-media/src/renderer/components/documents/invoice-receipt-filters-panel.tsx` |
| Documents table | Always visible in the workspace | A thumbnail column with a show/hide control in its header, then **Issuer**, **Date**, **Total** and **VAT** | `apps/desktop-media/src/renderer/components/documents/invoice-receipt-documents-table.tsx` |
| Help wizard | The help control, or automatically on first visit | Three slides: what analysis detects and extracts, data checks and filters, and the Ollama model in use | `apps/desktop-media/src/renderer/components/documents/invoices-receipts-help-modal.tsx` |
| Documents sidebar entry | Sidebar | A single **Invoices & Receipts** row under **Documents** | `apps/desktop-media/src/renderer/components/documents/desktop-sidebar-documents-section.tsx` |

**States**

| State | What the user sees |
|---|---|
| Sample mode | Sample rows, the amber "Example only" banner, no filter control and no pagination |
| Loading | A spinner with "Loading…" |
| Populated | The table, filters and pagination |
| No matches | "Nothing found for the current filters." |
| Load error | "Could not load invoice data." or "Could not load rows." above the table |

**UX notes**

- The filter panel is open by default when the library has documents, and closed in sample mode.
- Filters are applied automatically a moment after the last keystroke, so there is no Apply
  button; changing a filter always returns to the first page.
- Missing values render as an em dash rather than being left blank, so a sparse row is still
  readable.
- The header, including the filters, stays pinned while the table scrolls.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | An item is a document only when its AI image category is exactly invoice or receipt. | The table is about bills, not about all paperwork. | `apps/desktop-media/electron/db/invoice-receipt-documents.ts` |
| BR-2 | Deleted items never appear. | The table follows the catalog. | Same |
| BR-3 | Fields are read from the current storage shape first, then from two older shapes. | Libraries analysed by earlier versions keep working. | Same |
| BR-4 | Rows are ordered by document date, newest first, with undated documents last and file path as the tie-break. | Recent bills are the ones people look for. | Same |
| BR-5 | The issuer filter matches any part of the name, ignoring case. | Users remember fragments, not exact legal names. | Same |
| BR-6 | A date filter may be a year, a year and month, or a full date; a partial value is expanded to the first or last day of that period, depending on which end of the range it is. | Typing `2025` should mean the whole year. | `apps/desktop-media/src/renderer/lib/invoice-receipt-date-query.ts` |
| BR-7 | An amount filter only matches documents that actually have a total; documents without one are excluded rather than treated as zero. | A missing total is not a small total. | `apps/desktop-media/electron/db/invoice-receipt-documents.ts` |
| BR-8 | A currency filter only applies when exactly three letters have been entered, and matches exactly. | Prevents a half-typed code from emptying the table. | Same |
| BR-9 | A page holds 48 rows, and no request may ask for more than 200. | Keeps the table responsive on large libraries. | Same |
| BR-10 | The sample table appears only when the library holds no documents at all, and its rows cannot be opened. | The example must never be mistaken for real data. | `apps/desktop-media/src/renderer/components/documents/desktop-invoices-receipts-workspace.tsx` |
| BR-11 | A total with three or more decimal places is flagged as suspicious. | Real prices rarely carry more than two decimals. | `apps/desktop-media/src/renderer/lib/invoice-receipt-amount-warnings.ts` |
| BR-12 | VAT is flagged as inconsistent only when the stored amount matches neither a VAT-inclusive nor a VAT-exclusive reading of the total, the rate implied by the net amount is off by more than 0.35 percentage points, and the difference exceeds 10 per cent. | Different countries and layouts express VAT differently; the check must not cry wolf. | Same |
| BR-13 | When VAT is flagged as inconsistent, the decimal-precision hint for the same cell is suppressed. | One warning per problem. | Same |
| BR-14 | The help wizard opens by itself only until the user closes it once. | Helpful the first time, annoying the tenth. | `apps/desktop-media/src/renderer/hooks/use-invoices-receipts-auto-help.ts` |

## 8. Settings & defaults

This feature has no settings of its own.

| Setting | Default | Owned by | Effect here |
|---|---|---|---|
| Extract invoice data | On | [F-03-05](../03-ai-image-analysis/05-invoice-and-receipt-extraction.md) | Whether new rows gain issuer, date, total and VAT at all |
| AI model | `qwen3.5:9b` | [F-03-02](../03-ai-image-analysis/02-analysis-prompts-and-models.md) | How accurately the fields are read; the current value is named in the help wizard |

In-session choices — the thumbnail toggle, whether the filter panel is open, and the filter values
themselves — are not remembered between visits.

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Image category | `media_items.ai_metadata` | Decides whether an item appears here at all |
| Issuer, date, total, currency, VAT percent and amount | Same, under document data or the two older shapes | The table columns |
| File path and media kind | The catalog row | The thumbnail and what opens on click |
| Whether the help wizard was dismissed | Guided help settings | Whether it opens by itself |

Nothing on this screen writes to the library.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| [Invoice & receipt extraction](../03-ai-image-analysis/05-invoice-and-receipt-extraction.md) | Any real row | The sample table and its banner |
| The local database | Counting and listing | "Could not load invoice data." or "Could not load rows." |
| The original file on disk | The thumbnail and opening a row | A broken thumbnail; the catalog row remains |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `loadInvoiceReceiptCatalogCount` / `media:count-invoice-receipt-documents` | `libraryId` | How many documents exist, which decides sample mode |
| `loadInvoiceReceiptDocuments` / `media:list-invoice-receipt-documents` | `issuedBy`, `dateFrom`, `dateTo`, `totalFrom`, `totalTo`, `currency`, `page`, `pageSize`, `libraryId` | One page of filtered rows plus the total count |

Both are exposed as a small action registry in
`apps/desktop-media/src/renderer/actions/document-actions.ts`, so automation and the UI call the
same functions.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/sidebar-navigation.spec.ts` | Navigating to Documents → Invoices & Receipts, the "Example only" banner and a sample row being visible |
| Unit | `apps/desktop-media/electron/db/invoice-receipt-documents.test.ts` | Counting only invoice-or-receipt items, issuer filtering with paging, currency filtering, partial-year date filtering, and reading fields from the newer document-data shape |
| Unit | `apps/desktop-media/src/renderer/actions/document-actions.test.ts` | The count and list actions delegating to the right calls |
| Unit | `apps/desktop-media/src/renderer/lib/invoice-receipt-amount-warnings.test.ts` | Amount and VAT formatting, the decimal-precision hint and the VAT reconciliation check |
| Unit | `apps/desktop-media/src/renderer/lib/invoice-receipt-cell-format.test.ts` | Plain total and VAT cell formatting |
| Unit | `apps/desktop-media/src/renderer/lib/invoice-receipt-date-query.test.ts` | Expanding partial dates to inclusive range bounds |
| Unit | `apps/desktop-media/src/renderer/lib/invoice-receipt-date-draft.test.ts` | Formatting digits into a year-month-day field as the user types |
| Unit | `apps/desktop-media/src/renderer/lib/invoice-receipt-filter-count.test.ts` | The badge count of active filters |

**Coverage gaps:** the workspace component itself is untested — filter debouncing, the page reset
on filter change, the sample-mode switch, the thumbnail toggle and the error banners.

## 13. Known limitations & open questions

- **Limitation:** values cannot be corrected. A misread total can only be fixed by re-analysing
  the image.
- **Limitation:** there is no export to a spreadsheet or accounting tool, and no totals row.
- **Limitation:** the table cannot be sorted by any column; the order is always newest document
  date first.
- **Limitation:** the amount filter compares raw numbers regardless of currency, so a range spans
  currencies unless the currency filter is also set.
- **Limitation:** the same bill photographed twice appears as two rows; nothing detects duplicates
  here.
- **Limitation:** filter values are not remembered, so returning to the screen starts from an
  empty filter panel.
- **Open question:** the sample rows appear whenever the library holds no documents, including
  when the user has run analysis and genuinely owns no paperwork. There is no wording that
  distinguishes "not analysed yet" from "analysed, nothing found".

## 14. References

- Module: [Documents](README.md)
- [Invoice & receipt extraction](../03-ai-image-analysis/05-invoice-and-receipt-extraction.md) — where the fields come from
- [AI image analysis](../03-ai-image-analysis/01-ai-image-analysis.md) — the run that fills this table
- Recommended setup order: [`../JOURNEYS.md`](../JOURNEYS.md)
