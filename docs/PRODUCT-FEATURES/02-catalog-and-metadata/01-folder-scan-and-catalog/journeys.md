# Folder scan & catalog — user journeys

Section 5 of [F-02-01 Folder scan & catalog](README.md), expanded.

---

## J-02-01-1 — First scan of a new folder tree

**Trigger:** the user right-clicks a folder row in the sidebar and chooses **Scan for file
changes**.
**Preconditions:** at least one library root has been added, and the folder contains photos or
videos.

1. The user ticks **Include sub-folders** so the whole tree is covered, then presses the play
   control on the **Scan for file changes** row.
2. The Background operations dock opens a **Media metadata scan** card. Its first step,
   *Checking files on disk*, counts files as it records each one's identity.
3. The card moves to *Reading metadata and updating database*. Files are processed one at a time
   and the card names the folder currently being read.
4. If **Detect Country / City from GPS coordinates on folder scan** is enabled, a further step,
   *Updating location data from GPS*, resolves place names for every catalogued image that has
   coordinates. Otherwise the scan goes straight to the final step.
5. The last step, *Finalizing scan results*, reconciles files that are no longer on disk and
   records when each folder was scanned.
6. The card settles into a summary: how many entries were created, updated and left unchanged,
   how many failed, and — when geocoding ran — how many gained location data.

**Outcome:** every file in the tree has a catalog entry, and each folder carries the timestamp of
its scan. Search indexing, face detection and image analysis can now be run meaningfully.

**Alternate paths**

- **Include sub-folders** left unticked → only the selected folder's own files are read;
  subfolders keep whatever state they had.
- The user adds a brand-new library root instead → the same full recursive scan starts by itself,
  because **After adding a media library root folder, start a full metadata scan** is on by
  default.
- The folder has no photos or videos → the scan completes immediately with nothing counted, and
  its card disappears without the user having to dismiss it.

**Failure paths**

- Individual files cannot be read or parsed → each is counted as failed and named in the card's
  failure list; the rest of the scan continues.
- The location database is not ready and cannot be prepared → the geocoding step is skipped, place
  names stay empty, and the scan still completes successfully. The user can enable the setting and
  re-run later.

---

## J-02-01-2 — Re-scanning only what changed

**Trigger:** the user has added, edited, moved or deleted files on disk and wants the app to catch
up.
**Preconditions:** the tree was scanned at least once before.

1. The user opens **Folder AI analysis summary** from the folder's menu.
2. The **Quick folder scan** table reports, per folder, how many files are new, modified, removed
   and moved. Nothing has been read yet — this is a comparison of names, sizes and modification
   times against the catalog.
3. The user presses play on the folder scan card and picks **Only detected changes** from the
   **Full scan** menu.
4. The scan reads just the files the quick scan flagged, and reconciles missing files folder by
   folder rather than across the whole tree.
5. The summary reports the created, updated and removed counts; the dashboard refreshes with the
   new freshness timestamps.

**Outcome:** the catalog matches the disk again, at a fraction of the cost of a full read.

**Alternate paths**

- The user picks **Full folder tree** instead → every file is re-examined. Unchanged files are
  still recognised as unchanged, so the work is wasted rather than harmful.
- Files were only moved, not changed → their entries follow them to the new paths and keep their
  ratings, faces, descriptions and search index entries.
- The tree was never scanned before → the changes-only path has no baseline to compare against, so
  everything counts as new and the run is equivalent to a full scan.

**Failure paths**

- A moved file is paired with the wrong original because two files share a name and byte size →
  the user can switch **Quick scan: detect moved files using** to content-hash matching, which
  compares file contents instead. See
  [File identity & change tracking](../02-file-identity-and-change-tracking.md).

---

## J-02-01-3 — Opening a small folder and letting it refresh itself

**Trigger:** the user clicks a folder in the sidebar.
**Preconditions:** the folder holds fewer files than the auto-scan limit (default 100), and no
manual scan is running.

1. Thumbnails begin streaming immediately, before any scan starts.
2. A scan of that folder's own files starts in the background and appears in the dock.
3. If it changes nothing, its card removes itself as soon as it completes.

**Outcome:** small folders stay current without the user ever asking for a scan.

**Alternate paths**

- The folder holds at least as many files as the limit → no automatic scan; thumbnails still load,
  and the user can run **Scan for file changes** manually.
- The folder has no direct media but does have subfolders → no automatic scan, and — with **On
  empty folder selection show AI analysis status summary for subfolders** on by default — the
  folder summary opens instead of an empty grid.
- A manual scan is already running → the automatic scan is skipped so the manual job is not
  disturbed.

---

## J-02-01-4 — Cancelling a scan that is taking too long

**Trigger:** the user presses **Cancel scan** on the scan card.

1. The scan stops at the next file boundary. Files already read keep their catalog entries.
2. The remaining files are counted as cancelled and shown in the summary.
3. Reconciliation of missing files is skipped, because the run no longer has a complete view of
   what is on disk.
4. Folders whose files were all read still record their scan timestamp; partially read folders do
   not.

**Outcome:** partial progress is kept, and nothing is deleted on the strength of an incomplete
picture. Running the scan again resumes the work — already-read files are recognised as unchanged.

**Alternate paths**

- The user navigates to another folder instead of cancelling → a manually started scan keeps
  running; only automatic scans are affected by changing selection.

---

## J-02-01-5 — Scanning a folder that contains unreadable files

**Trigger:** a scan reaches a file that is corrupt, truncated, or in a format whose metadata
cannot be parsed.

1. The file still gets a catalog entry, with its dimensions and dates left empty and the parse
   error recorded against it.
2. The scan counts it as failed and continues with the next file.
3. The summary reports the failed count, and the failed files are listed in the card.
4. The same files appear in the folder dashboard's failed list, where they can be revisited.

**Outcome:** one bad file never stops a scan, and the user can find out which files were a
problem.

---

## J-02-01-6 — Starting an AI pipeline on a folder that was never scanned

**Trigger:** the user runs **Face detection**, **Image AI analysis** or **Index images for AI
search** on a folder without having scanned it.

1. Before each image is processed, the app makes sure that image has a catalog entry, extracting
   its metadata on the spot if needed.
2. The pipeline proceeds normally, and its results attach to real catalog entries.

**Outcome:** the pipeline works, but the folder's own scan timestamp is not set, so the folder
dashboard still reports it as not scanned and the quick scan still shows its files as new. Running
**Scan for file changes** afterwards resolves that.

**Alternate paths**

- The catalog entry exists but holds no metadata yet (created by an earlier pipeline as a stub) →
  extraction runs for that image immediately before the AI step.

---

Cross-module context: this feature owns step 2 of
[the recommended setup path](../../JOURNEYS.md#j-x1--recommended-setup-path-first-library), and is
step 1 of [J-X5 — keeping the library current](../../JOURNEYS.md#j-x5--keep-the-library-current-after-adding-new-files).
