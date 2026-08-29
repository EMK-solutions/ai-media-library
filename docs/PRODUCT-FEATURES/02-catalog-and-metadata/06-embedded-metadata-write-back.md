---
id: F-02-06
module: 02-catalog-and-metadata
title: Embedded metadata write-back
status: partial
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/electron/ipc/media-item-mutation-handlers.ts
  - apps/desktop-media/electron/lib/write-star-rating-exiftool.ts
  - apps/desktop-media/electron/lib/exiftool-runtime.ts
  - apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx
related:
  - F-01-05
  - F-02-07
---

# Embedded metadata write-back

> Optionally write a change you make in the app back into the original file, so other programs
> see the same rating.

## 1. Summary

By default the app is read-only towards the user's files. Ratings, titles and descriptions live in
the catalog; the originals on disk are not touched. Users who want their ratings to travel — into
Lightroom, Windows Explorer, or a copy of the file they send someone — can turn on
**Update file metadata on change of Rating, Title, Description**. After that, every star-rating
change is also written into the file's XMP and EXIF blocks in the form those other programs
expect.

The catalog is still the source of truth. If the file write fails, the rating the user just set
stays in the app; the original file is not rolled back and the user is not blocked. The write is
queued per file so two rapid clicks cannot leave an older rating on disk.

Title and description write-back is advertised in the setting label but is not implemented yet —
only star rating is mirrored today. That is why this feature is **partial**.

## 2. User stories

- **As someone who already rates photos in Lightroom** I want ratings I set here to show up there,
  **so that** I do not maintain two rating systems.
- **As a cautious owner** I want the app to leave my files alone unless I turn this on,
  **so that** trying the product cannot damage the only copy I have.
- **As someone rating quickly** I want a failed file write not to undo the rating I just set,
  **so that** the app stays usable even when a file is locked or unwritable.

## 3. Scope

**In scope**

- The setting that opts in to writing catalog edits back into files
- Star-rating write-back into XMP and EXIF, for photos and videos
- Queueing writes so overlapping edits to the same file stay in order
- Refreshing the catalog after a successful write without treating it as a content change

**Out of scope**

- The rating control itself — see [Star rating](../01-library-browsing-and-media-viewer/05-star-rating.md)
- Reading ratings out of files during a scan — owned by [Folder scan & catalog](01-folder-scan-and-catalog/README.md)
- Writing titles or descriptions (not implemented)

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Rating UI and catalog values | [Star rating](../01-library-browsing-and-media-viewer/05-star-rating.md) |
| Not discarding AI results after a rating write | [AI result invalidation](07-ai-result-invalidation.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-02-06.1 | Opt-in setting | Writes stay off until the user turns the setting on | shipped |
| F-02-06.2 | Star-rating write-back | Rating is mirrored into the file via ExifTool | shipped |
| F-02-06.3 | Title and description write-back | Same for titles and descriptions | planned |

## 5. User journeys

### J-02-06-1 — Turn on write-back and rate a photo

**Trigger:** the user wants ratings to travel with the files.
**Preconditions:** a folder has been scanned; the files are writable.

1. Open **Settings → Folder scanning, file metadata and Geo-location**.
2. Turn on **Update file metadata on change of Rating, Title, Description**.
3. Rate a photo from the grid or the info panel.
4. The catalog updates immediately. In the background the app writes the rating into the file.
5. The grid refreshes the file's modification time without asking the user to re-select the folder.

**Outcome:** the same rating is visible in the app and in other programs that read XMP/EXIF.

**Failure paths**

- The file is read-only or ExifTool cannot write it → the rating still stands in the app; the file
  is unchanged. The next scan will not overwrite the catalog rating with the old embedded value
  because the catalog already has the user's rating.

### J-02-06-2 — Leave files untouched (the default)

**Trigger:** first use, or a user who does not want the app to modify files.

1. Leave the setting off (the shipped default).
2. Rate photos as usual.

**Outcome:** ratings exist only in the catalog. Original files are unmodified.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Settings — Folder scanning | Sidebar **Settings** | Checkbox **Update file metadata on change of Rating, Title, Description**; description explains XMP/EXIF and that only rating is mirrored today | `apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx` |

**States**

| State | What the user sees |
|---|---|
| Off (default) | No extra UI; rating changes feel instant |
| On | Same rating control; a brief catalog refresh after the file write completes |
| Write failed | Rating remains; no blocking error dialog (a warning is logged) |

**UX notes** — the setting description is honest that the write happens *after* the catalog save,
and that off is recommended. The label still mentions Title and Description even though those
writes are not shipped; that mismatch is recorded as a limitation.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Write-back is off by default. | The product is non-destructive unless the user opts in. | `apps/desktop-media/src/shared/ipc.ts` (`DEFAULT_FOLDER_SCANNING_SETTINGS`) |
| BR-2 | When the setting is off, a rating change updates only the catalog. | Makes the default path risk-free. | `apps/desktop-media/electron/ipc/media-item-mutation-handlers.ts` |
| BR-3 | When the setting is on, the catalog is updated first, then ExifTool writes the file. | The user's action must never wait on a file write, and must never be undone by a write failure. | `apps/desktop-media/electron/ipc/media-item-mutation-handlers.ts` |
| BR-4 | Star rating written to files is an integer 0–5 (0 means unrated). | Matches the catalog and common XMP/Windows conventions. | `apps/desktop-media/electron/lib/write-star-rating-exiftool.ts` |
| BR-5 | Writes to the same file are serialised. | Rapid successive clicks must not leave an older rating on disk. | `apps/desktop-media/electron/ipc/media-item-mutation-handlers.ts` |
| BR-6 | After a successful write, the catalog is refreshed as a trusted embedded-metadata edit, so AI results are not discarded. | A rating must not cost the user their face tags or search index. | `apps/desktop-media/electron/db/media-ai-invalidation-guards.ts` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| Update file metadata on change of Rating, Title, Description | Off | Mirrors star-rating changes into the original file | No |

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Star rating | Catalog (`media_items.star_rating`) always; XMP/EXIF in the file when the setting is on | Survives restart; travels with the file only when write-back is on |
| Setting | App settings file | Survives restart |

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Bundled ExifTool | Actually writing the file | Catalog still updates; file stays unchanged |
| Writable original file | The write succeeding | Same as above |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `media:set-media-item-star-rating` | `sourcePath`, `starRating` (0–5) | Set the catalog rating; write the file if the setting is on |
| `media:media-item-metadata-refreshed` | path → metadata map | Push the refreshed catalog row after a file write |

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| Unit | `apps/desktop-media/electron/db/media-item-star-rating-update.test.ts` | Catalog update |
| Unit | `apps/desktop-media/electron/db/embedded-write-path-key.test.ts` | Per-path write queue key |
| Unit | `apps/desktop-media/electron/storage.test.ts` | Setting persistence |
| Unit | `apps/desktop-media/electron/db/media-ai-invalidation-guards.test.ts` | Trusted write does not invalidate AI |

**Coverage gaps:** there is a dedicated star-rating Playwright suite under
`apps/desktop-media/tests/e2e-standalone/star-rating.spec.ts`, but it is not part of the main
`tests/e2e/` run. Title and description write-back has no tests because it is not implemented.

## 13. Known limitations & open questions

- **Limitation:** the setting label mentions Title and Description, but only star rating is
  written today. Titles and descriptions stay in the catalog only.
- **Limitation:** write failures are logged, not surfaced as a toast or dialog.
- **Open question:** whether turning the setting on should offer a one-shot "write current ratings
  to files" pass, or only affect future edits.

## 14. References

- Module: [Catalog & Metadata](README.md)
- [Star rating](../01-library-browsing-and-media-viewer/05-star-rating.md)
- [AI result invalidation](07-ai-result-invalidation.md)
- Implementation history: `docs/IMPLEMENTATION-LOG/features/2026-04_media_star_rating_ux_0eef34a5.plan.md`,
  `docs/IMPLEMENTATION-LOG/features/2026-04_avoid_ai_invalidation_on_rating_embed_77039b62.plan.md`
