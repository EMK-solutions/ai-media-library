# Duplicate files — journeys

Journeys for [F-08-02](README.md).

### J-08-02-1 — Check a library from Insights

**Trigger:** Insights → **Duplicate files**.
**Preconditions:** at least one library root has been added.

1. With one root, a scan is enqueued for that path (recursive) without showing the hub heading.
2. If the Background operations dock was collapsed, it expands.
3. The main pane shows **Duplicates in folder** (with **with subfolders** when recursive) until
   results arrive.
4. The workspace opens on **By folder**.

**Outcome:** the user sees inside-tree vs outside-tree duplicate summaries for that root.

**Alternate paths**

- Two or more roots → **Duplicate files** hub; picking a card starts this journey for that
  path.
- No roots → **Please add folders first and run full scan**.
- **Back** / **Exit duplicates view** from a single-root session returns to the hub with that
  root's card.

**Failure paths**

- Enqueue rejected (validation or overlapping active scan) → error string from the rejection;
  no workspace.

### J-08-02-2 — Check one folder from the tree

**Trigger:** folder row ⋮ or right-click → **Check duplicate files**.
**Preconditions:** the row is a library folder.

1. The accordion offers **Include sub-folders** (default on).
2. Play starts a scan for **that row's path** and the chosen flag — not the Insights hub.
3. Same scanning shell and workspace as J-08-02-1.

**Outcome:** duplicates are listed relative to that folder, including matches that live
*outside* it when the hash exists elsewhere in the library.

### J-08-02-3 — Mark copies and delete

**Trigger:** the user is in **By file** (directly, or after clicking a folder row in **By
folder**).
**Preconditions:** the scan finished with at least one pair.

1. Each side of a pair has a mark-for-delete control. **Select all** / **Clear all** apply to
   the current page of that column.
2. Trash on a column is enabled only when that column has marks and no delete job is running.
3. **Delete files?** shows file count, folder count, total size, and **Move deleted files to
   Recycle Bin or Trash** (checked). Unchecking permanently deletes.
4. Confirm enqueues **Delete duplicate files (N)**. Conflicting mark/delete controls disable
   until it finishes.
5. Removed files leave the workspace lists; catalog rows are soft-deleted.

**Outcome:** marked copies are gone from disk (or in the trash) and from the review list.

**Alternate paths**

- Weak-match rows show an amber note; the user can still mark them.
- Different file names on the duplicate side get a **Different file name** hint.

**Failure paths**

- A target's path no longer matches the catalog → that file is reported failed; others
  continue.
- More than 10,000 targets → the job is rejected.

### J-08-02-4 — Cancel a scan

**Trigger:** the user presses **X** on the running **Check duplicate files** card.
**Preconditions:** the scan job is running.

1. The bundle is cancelled; hashing stops at the next yield.
2. A cancelled completion does not replace a newer session's results.
3. **X** on a completed card only hides it.

**Outcome:** the user can start another check; a cancelled job is not treated as a result set.
