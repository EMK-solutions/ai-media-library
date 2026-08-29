---
id: F-13-04
module: 13-platform-and-distribution
title: Privacy & offline stance
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/src/renderer/components/onboarding/guided-slide-catalog.ts
  - docs/PRODUCT-FEATURES/README.md
  - docs/limitations-and-transparency.md
  - docs/END-USER-GUIDE/install.md
related:
  - F-12-01
  - F-12-03
  - F-10-01
  - F-13-03
  - F-02-06
---

# Privacy & offline stance

> Photos stay in the folders you pointed at; catalog and AI results stay on this computer;
> there is no product cloud account — with a short list of network uses that still happen.

## 1. Summary

The product’s positioning is **local-first**: no account, no upload of the library for
analysis, original files untouched unless the user turns on write-back. Welcome copy states
that photos and AI processing stay on this computer and that the database is under the user’s
control. That is the rule for **pipelines**. It is not a claim of zero network: ONNX/embedding
weights and GeoNames are downloaded from the internet once, Ollama is local HTTP, TV broadcast
serves a folder on the **LAN**, and auto-update talks to GitHub. Those exceptions are
observable and optional (GPS off until confirmed; TV off when not broadcasting; Ollama unused
if the user never runs analysis).

## 2. User stories

- **As a privacy-conscious user** I want analysis without a Google/Apple photo account,
  **so that** I can still search by what’s in the picture.
- **As an archivist** I want the default to be read-only on files,
  **so that** trying the app cannot rewrite my only copies.
- **As a careful admin** I want to know when the app *does* use the network,
  **so that** “offline AI” is not marketing for “never phones home”.

## 3. Scope

**In scope**

- What the product promises about data location and accounts
- Honest exceptions (downloads, LAN broadcast, updates)
- Pointers to write-back and TV PIN as user-controlled sharing

**Out of scope**

- Implementing a VPN or air-gap mode
- GDPR subprocessors list (there is no vendor photo cloud)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Welcome privacy slide | [First-run welcome](../12-onboarding-and-help/01-first-run-welcome.md) |
| File write-back default off | [Embedded metadata write-back](../02-catalog-and-metadata/06-embedded-metadata-write-back.md) |
| LAN slideshow | [TV broadcast](../10-sharing-and-presentation/01-tv-broadcast.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-13-04.1 | Local catalog & AI | No cloud library account | shipped |
| F-13-04.2 | Non-destructive default | Files not rewritten unless write-back is on | shipped |
| F-13-04.3 | Documented network exceptions | Downloads, LAN, updates | shipped |

## 5. User journeys

### J-13-04-1 — Understand the promise on first run

**Trigger:** welcome slide **Data privacy and ownership**.

1. User reads **Fully local** and **You own your data**.
2. Later slides explain Ollama is a **local** extra install, not a cloud API the app owns.

**Outcome:** expectation set before the first folder is added.

### J-13-04-2 — Keep files untouched

**Trigger:** Settings write-back checkbox.

1. Leave **Update file metadata on change of Rating…** off (default).
2. Ratings and AI text stay in the catalog only.

**Outcome:** originals unchanged for those edits.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Welcome privacy slide | First-run / Features overview | Fully local; you own your data | `guided-slide-catalog.ts` (`privacyLocal`) |
| Welcome licenses slide | Next | MIT app vs model licenses | same |
| End-user install notes | External doc | Model licenses are third-party | `docs/END-USER-GUIDE/install.md` |

**States**

| State | What the user sees |
|---|---|
| GPS off (default) | No GeoNames download |
| TV idle | No LAN server |
| Write-back off (default) | Catalog-only edits |

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Core analysis, faces and search embeddings run against local models/files, not a product SaaS. | Matches README positioning. | Product README; pipelines in desktop-media |
| BR-2 | No sign-in or vendor photo account is required to use the library. | Same. | App has no auth screen |
| BR-3 | Embedded file writes are opt-in (default off). | Non-destructive default. | `DEFAULT_FOLDER_SCANNING_SETTINGS.writeEmbeddedMetadataOnUserEdit` |
| BR-4 | TV broadcast is LAN HTTP, PIN on by default, not an internet publish. | Sharing in the house ≠ cloud sharing. | F-10-01 |
| BR-5 | Welcome copy: data is not sent to the cloud for analysis. | User-facing contract. | `guided-slide-catalog.ts` |

## 8. Settings & defaults

None owned here. Defaults that implement the stance:

| Setting (UI label) | Default | Effect | Owner |
|---|---|---|---|
| Update file metadata on change of Rating… | Off | No ExifTool write-back | F-02-06 |
| Detect Country / City from GPS… | Off | No 2 GB download until confirmed | F-02-04 |
| Request 4-digit PIN on TV | On | LAN page gated | F-10-01 |

## 9. Data & persistence

All durable library data is local (`desktop-media.db`, `media-settings.json`, models, GeoNames).
There is no product sync account in this app.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Disk only | Browsing thumbnails | Works offline once files and catalog exist |
| Network | First model/GeoNames/update | Those features wait or fail; browsing still works |
| Ollama | Analysis / translation | Those jobs fail; faces/search-index can still use on-device models |

## 11. Automatable actions & API surface

None specific. Privacy is a constraint on other features’ actions.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `product-welcome-first-launch.spec.ts` | Welcome (includes privacy in the deck, not asserted by that spec) |
| E2E | folder browsing specs | Removing a library root does not delete files on disk |

**Coverage gaps:** no automated “assert no cloud HTTP for analysis” test; TV PIN covered in
`tv-broadcast.spec.ts`.

## 13. Known limitations & open questions

- **Limitation:** first-run model downloads and updates require the internet; “offline AI”
  means inference, not “never connects”.
- **Limitation:** TV broadcast binds `0.0.0.0` — any device on the LAN that has the PIN can
  load the page.
- **Open question:** whether Settings should list “network used for” in Application data /
  a dedicated privacy card.

## 14. References

- Module: [Platform & Distribution](README.md)
- Product positioning: [`../README.md`](../README.md)
- `docs/limitations-and-transparency.md`
- `docs/END-USER-GUIDE/install.md`
