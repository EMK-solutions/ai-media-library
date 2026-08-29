---
id: F-02-02
module: 02-catalog-and-metadata
title: File identity & change tracking
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/electron/db/file-identity.ts
  - apps/desktop-media/electron/db/media-item-reconciliation.ts
  - apps/desktop-media/electron/lib/folder-tree-quick-scan-compute.ts
  - apps/desktop-media/electron/lib/folder-tree-quick-scan-moves.ts
  - apps/desktop-media/electron/db/media-item-sources.ts
related:
  - F-02-01
  - F-02-07
---

# File identity & change tracking

> Reorganise, rename and tidy your folders in your file manager, and the app keeps everything it
> learned about each photo.

## 1. Summary

People reorganise photo folders constantly: by year, by trip, by "sort this later". If the app
recognised files only by path, every reorganisation would look like a mass deletion followed by a
mass import, and the ratings, face tags, descriptions and search index built up over hours would
be lost.

This feature gives every file an identity that survives being moved. Each file is recorded with
its operating-system identifier, size, modification time and — for files up to 128 MiB — a hash of
its contents. When a scan finds the same file at a different path, the catalog entry follows it and
keeps everything attached to it. Files with identical contents are grouped so duplicates can be
reviewed. Files that genuinely disappeared are marked rather than erased, so a file that shows up
again in another folder still recovers its history.

The same machinery powers the **Quick folder scan** report: a fast comparison of the folder tree
against the catalog that tells the user how many files are new, modified, removed and moved,
without reading a single file's contents.

## 2. User stories

- **As someone reorganising an archive** I want moved and renamed files to keep their ratings,
  people and descriptions, **so that** reorganising costs me nothing.
- **As a returning user** I want to see at a glance how much has changed since the last scan,
  **so that** I know whether a re-scan is worth starting.
- **As someone cleaning up** I want to know which files are exact copies of each other,
  **so that** I can delete the redundant ones safely.
- **As someone who deleted files by mistake** I want the app not to have thrown away everything it
  knew about them, **so that** restoring the file restores its history.

## 3. Scope

**In scope**

- Recognising a file across moves and renames within a library
- Recording content fingerprints, and grouping files with identical contents
- Marking catalog entries whose files are gone, and restoring them when the files return
- Permanently removing long-deleted entries
- The quick folder-tree comparison and the new / modified / removed / moved counts it reports
- Choosing how a removed path is paired with a new file as a move

**Out of scope**

- Reading metadata out of the files — see [Folder scan & catalog](01-folder-scan-and-catalog/README.md)
- Deciding whether a changed file's AI results are still valid — see
  [AI result invalidation](07-ai-result-invalidation.md)
- The duplicate review screens and the delete actions on them
- Watching the filesystem for changes; nothing is detected until a scan or quick scan runs

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Reviewing and deleting duplicate files | [Insights & Library Health](../08-insights-and-library-health/README.md) |
| The folder dashboard the quick scan table is shown in | [Insights & Library Health](../08-insights-and-library-health/README.md) |
| Running the scan that acts on the detected changes | [Folder scan & catalog](01-folder-scan-and-catalog/README.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-02-02.1 | Move and rename tracking | A file that changed path keeps its catalog entry, ratings, faces, descriptions and search index | shipped |
| F-02-02.2 | Content fingerprinting | Files up to 128 MiB get a content hash, used for move confirmation and duplicate detection | shipped |
| F-02-02.3 | Duplicate grouping | Files with identical contents are grouped, feeding the duplicate review | shipped |
| F-02-02.4 | Missing-file marking and restore | Deleted files stop appearing; a returning file recovers its history | shipped |
| F-02-02.5 | Permanent removal | Entries deleted for over 30 days, or explicitly chosen, are erased with everything attached | shipped |
| F-02-02.6 | Quick folder scan report | Per-folder counts of new, modified, removed and moved files, without reading file contents | shipped |
| F-02-02.7 | Move matching mode | A choice between fast name-and-size pairing and slower content-hash confirmation | shipped |

## 5. User journeys

### J-02-02-1 — Reorganise a folder tree and re-scan

**Trigger:** the user rearranges photos into new folders in their file manager, then re-scans.
**Preconditions:** the tree was scanned before the reorganisation.

1. The user opens **Folder AI analysis summary** on the tree root. The **Quick folder scan** table
   reports files under **Moved** rather than under **New files** and **Removed**.
2. The user runs the folder scan.
3. Each moved file is recognised by its operating-system identity, so its catalog entry is updated
   to the new path instead of a new entry being created.
4. Ratings, face tags, descriptions, album memberships and search index entries stay attached.

**Outcome:** the app's picture of the library matches the new folder layout, with no work lost.

**Alternate paths**

- The file was moved to a different disk, so its operating-system identity changed → it is matched
  by size and modification time against recently removed files, within a 24-hour window.
- The file was moved *and* edited → it is treated as a new file at the new path, and the old entry
  is marked deleted. AI results do not carry over.
- Two files in the tree share a name and byte size → the pairing may attach the wrong entry. See
  the match-mode setting in section 8.

**Failure paths**

- The move happened more than 24 hours before the scan, and the operating-system identity changed
  → the old entry stays marked as deleted and the file is catalogued fresh. Its AI results are
  lost, and the pipelines have to run again.

### J-02-02-2 — Check what changed before committing to a scan

**Trigger:** the user wants to know whether a re-scan is worth starting.

1. The user opens **Folder AI analysis summary** and looks at **Quick folder scan**.
2. The table lists, per folder, **New files**, **Modified**, **Removed**, **Moved**, **Folders with
   media** and **Scan status**. No file contents were read to produce it.
3. The user starts a changes-only scan, or decides nothing needs doing.

**Outcome:** the decision to scan is informed rather than blind.

**Alternate paths**

- The tree has never been scanned → everything is reported as new.
- The user chose content-hash move matching → producing the table reads the candidate files, so it
  takes noticeably longer on large trees.

### J-02-02-3 — Delete files and get them back

**Trigger:** files are deleted from disk, then restored from a backup or recycle bin.

1. A scan finds the files missing and marks their catalog entries as deleted. They stop appearing
   in the grid, in search results and in albums.
2. The user restores the files to the same folder.
3. The next scan of that folder finds them again and restores their entries, complete with
   ratings, faces and descriptions.

**Outcome:** an accidental deletion followed by a restore costs nothing.

**Alternate paths**

- The files are restored to a *different* folder within the library → they are matched by content
  and still recover their history, provided the restore happens within 24 hours of the removal
  being recorded.
- More than 30 days pass → the entries can be permanently removed, along with their faces, search
  vectors, album memberships and tags. Restoring the file after that produces a fresh entry.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Quick folder scan table | Folder row menu → **Folder AI analysis summary** → **Folder tree scan** → **Quick folder scan** | Columns: **New files**, **Modified**, **Removed**, **Moved**, **Folders with media**, **Scan status**; one row per subfolder plus tree and direct-only totals | `apps/desktop-media/src/renderer/components/folder-ai-summary/DesktopFolderAiSummaryDashboard.tsx` |
| Scan summary in the dock | Any running scan | Moved paths and removed entries are reported in the completed scan's summary | `apps/desktop-media/src/renderer/components/progress-dock/cards/MetadataScanCard.tsx` |
| Move matching setting | Settings → **Folder scanning, file metadata and Geo-location** (advanced) | **Quick scan: detect moved files using**, with two options | `apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx` |

**States**

| State | What the user sees |
|---|---|
| Never scanned | Every file counted as new; scan status reports the folder as not scanned |
| No differences | All four change columns at zero |
| Changes present | Non-zero counts, and the folder scan card offering **Only detected changes** |
| Large tree | The quick scan takes visible time; content-hash matching makes it slower still |

**UX notes**

- The quick scan is read-only and non-destructive. It reports; it never changes the catalog.
- Moves are reported separately from new and removed files on purpose, so a reorganisation does not
  look alarming.
- Nothing is detected in the background. The counts are as of the moment the table was produced.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | A file is identified first by its operating-system identity (volume and file id), then by its path, then by matching a recently removed file. | The operating-system identity survives renames and moves within a disk, which covers most reorganisations for free. | `apps/desktop-media/electron/db/file-identity.ts` |
| BR-2 | When a file is recognised at a new path, the catalog entry's path and filename are updated in place rather than a new entry being created. | Everything attached to the entry — ratings, faces, descriptions, album membership — must follow the file. | `apps/desktop-media/electron/db/file-identity.ts`, `apps/desktop-media/electron/db/media-item-sources.ts` |
| BR-3 | A removed file can be matched to a newly seen file by size and modification time only within 24 hours of the removal being recorded. | Beyond that window the coincidence rate is too high to trust. | `apps/desktop-media/electron/db/file-identity.ts` |
| BR-4 | When several removed files share the same size and modification time, the match is only made if a content hash confirms which one it is. Otherwise the file is treated as new. | Attaching the wrong history to a photo is worse than losing it. | `apps/desktop-media/electron/db/file-identity.ts` |
| BR-5 | Content hashes are computed only for files up to 128 MiB. | Hashing very large videos on every scan would dominate the scan's cost. | `apps/desktop-media/electron/db/file-identity.ts` |
| BR-6 | Two or more files sharing a content hash form a duplicate group; when only one file with that hash remains, the group is dissolved. | Duplicate review must reflect the current state of the disk, not a historical one. | `apps/desktop-media/electron/db/file-identity.ts` |
| BR-7 | A file present in the catalog but absent from its folder on disk is marked deleted, not erased. | Moves across folders are observed at different times during a scan; erasing immediately would destroy history mid-scan. | `apps/desktop-media/electron/db/media-item-reconciliation.ts` |
| BR-8 | Removal is evaluated per folder against that folder's direct contents only, never against a whole subtree. | A scan of one folder must not conclude that files in sibling folders are gone. | `apps/desktop-media/electron/db/file-identity.ts`, `apps/desktop-media/electron/db/media-item-reconciliation.ts` |
| BR-9 | Entries marked deleted for more than 30 days can be permanently removed, together with their faces, search vectors, album memberships, tags, identity records and path records. | Bounds the size of the database while giving a generous recovery window. | `apps/desktop-media/electron/db/media-item-reconciliation.ts` |
| BR-10 | The quick scan compares filename, byte size and modification time against the catalog. A file whose size or modification time differs is reported as modified. | Gives a useful change report at a fraction of the cost of reading files. | `apps/desktop-media/electron/lib/folder-tree-quick-scan-compute.ts` |
| BR-11 | A removed path and a new path are paired as a move only when their filenames match, case-insensitively. Under the default mode the byte sizes must also match; under content-hash mode the new file's hash must additionally equal the removed entry's recorded hash. | Filename equality is the strongest cheap signal for a move; the optional hash check removes the remaining false pairs. | `apps/desktop-media/electron/lib/folder-tree-quick-scan-moves.ts` |
| BR-12 | Content-hash move matching is skipped for files over 128 MiB or for entries with no recorded hash, and those candidates are not paired as moves. | Consistent with the fingerprinting limit; the alternative would be silently unreliable pairs. | `apps/desktop-media/electron/lib/folder-tree-quick-scan-moves.ts` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| Quick scan: detect moved files using | **Filename + byte size (default, fast)** | How a removed catalog path is paired with a new file on disk. The alternative, **SHA-256 content hash (slower, fewer false positives)**, reads the candidate file and compares its hash with the recorded one. | Yes |

Defined in `apps/desktop-media/src/shared/ipc.ts` (`DEFAULT_FOLDER_SCANNING_SETTINGS`); surfaced in
Settings → **Folder scanning, file metadata and Geo-location**.

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Per-file identity record | `fs_objects` (path, volume and file id, size, modification and change times, fingerprint) | How the app recognises this file again after it moves |
| Content hash | `fs_objects.strong_hash`, projected to `media_items.content_hash` | Whether two files are exactly the same, and whether a file's content really changed |
| Duplicate group | `fs_objects.duplicate_group_id`, projected to `media_items.duplicate_group_id` | Which other files are exact copies of this one |
| Removal marker | `fs_objects.deleted_at`, `media_items.deleted_at` | The file is gone from disk, but its history is retained |
| Known paths per item | `media_item_sources` | Every path this catalog entry has been seen at, and which is current |
| Folder tree snapshot | `folder_quick_scan_snapshot` | Baseline for the quick comparison |

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Filesystem identity information | Recognising renames and moves within a disk | Falls back to size and modification time matching within 24 hours; beyond that, moved files look new |
| Read access to file contents | Content hashes, duplicate grouping, hash-confirmed moves | Files keep an empty fingerprint, are excluded from duplicate groups, and cannot be hash-matched |
| A prior scan of the tree | Meaningful quick scan counts | Everything is reported as new |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `media:get-folder-tree-scan-summary` | `folderPath`, `outdatedAfterDays` | Produce the quick scan counts and per-subfolder breakdown |
| `media:purge-deleted-media-items` | — | Permanently remove entries deleted beyond the grace period |
| `media:purge-soft-deleted-media-items-by-ids` | `mediaItemIds` | Permanently remove specific already-deleted entries |
| `media:scan-folder-metadata` with `scanScope: "incremental"` | `folderPath`, `recursive` | Act on exactly what the quick scan found |

Defined in `apps/desktop-media/src/shared/ipc.ts`.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| Integration | `apps/desktop-media/electron/db/observe-files-move.integration.test.ts` | A file moved between folders is not marked deleted when the source folder is prepared before the destination |
| E2E | `apps/desktop-media/tests/e2e/metadata-scan-file-churn.spec.ts` | A cross-folder move is not reported as missing on disk; a deletion is; a same-folder duplicate and a rename cause no missing-on-disk regression |
| E2E | `apps/desktop-media/tests/e2e/metadata-scan-edited-file-reset.spec.ts` | A file replaced with different content under the same name is re-read on the next scan |
| Unit | `apps/desktop-media/electron/lib/folder-tree-quick-scan-moves.test.ts` | Same filename and size are paired as a move in the default mode; differing byte sizes are not; parent-folder derivation for both path styles |
| Unit | `apps/desktop-media/electron/lib/folder-tree-quick-scan-coverage.test.ts` | Which folders count as having direct media on disk |

**Coverage gaps:** the 24-hour restore window, the ambiguous multi-candidate case, duplicate group
dissolution, content-hash move matching and the grace-period purge all lack automated coverage.

## 13. Known limitations & open questions

- **Limitation:** nothing is detected until a scan or quick scan runs. The app does not watch the
  filesystem, so a move made after a scan is invisible until the next one.
- **Limitation:** a file moved across disks and rescanned more than 24 hours later loses its
  history, and its AI pipelines have to run again.
- **Limitation:** files over 128 MiB get no fingerprint, so large videos cannot be hash-matched as
  moves and never appear in duplicate groups.
- **Limitation:** the default move matching can pair the wrong files when a name and byte size
  coincide. The safer mode exists but is hidden behind advanced settings.
- **Limitation:** a move is only recognised within the same library. Moving files between two
  library roots is seen as a deletion and an unrelated addition.
- **Open question:** permanent removal of long-deleted entries is exposed as an action but has no
  scheduled trigger or UI, so in practice deleted entries accumulate.

## 14. References

- Module: [Catalog & Metadata](README.md)
- [Folder scan & catalog](01-folder-scan-and-catalog/README.md) — the scan that acts on what this
  feature detects
- [AI result invalidation](07-ai-result-invalidation.md) — what happens when a file really changed
- [J-X4 — clean up a disorganised library](../JOURNEYS.md#j-x4--clean-up-a-disorganised-library),
  [J-X5 — keep the library current](../JOURNEYS.md#j-x5--keep-the-library-current-after-adding-new-files)
- Implementation history: `docs/IMPLEMENTATION-LOG/features/2026-03_file_identity_dedup_deletion_718497b7.plan.md`
