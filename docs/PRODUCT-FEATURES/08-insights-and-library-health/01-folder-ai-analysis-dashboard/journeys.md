# Folder AI analysis dashboard — journeys

Journeys for [F-08-01](README.md).

### J-08-01-1 — First look at a folder tree

**Trigger:** the user chooses **Folder AI analysis summary** on a library-root row.
**Preconditions:** the folder is in the sidebar; a catalog may or may not exist yet.

1. The media grid is replaced by the summary view. The folder content header (search, filters,
   Analysis strip) is hidden.
2. Image and video count cards appear as soon as the overview query returns; scan and AI cards
   keep spinning independently.
3. The title reads **Folder tree analysis summary** if there are immediate sub-folders, otherwise
   **Folder analysis summary**. The path is shown under the title.
4. The user presses Refresh to reload from the catalog, or **Back to images** to return to the
   grid.

**Outcome:** the user knows counts, scan freshness and pipeline coverage without running anything.

**Alternate paths**

- Insights → **Folder analysis status** with one library root → the same view opens for that
  root.
- Two or more roots → the library pick hub; choosing a card opens this journey for that root.
- No library roots → hub copy: **Please add folders first and run full scan**.

**Failure paths**

- Overview or coverage load fails → **Could not load folder summary.**

### J-08-01-2 — Start the next pipeline from a card

**Trigger:** the user presses Play on **AI search index**, **Face detection**, **AI Image
analysis** or **Wrongly rotated images**.
**Preconditions:** the dashboard is showing coverage for the selected folder.

1. The card's Play becomes a spinner (running) or hourglass (queued).
2. A job named for that pipeline and folder appears in **Background operations**.
3. The user can leave the dashboard; the job keeps running.
4. When the job finishes, the dashboard refreshes if this folder was in scope.

**Outcome:** coverage on that card moves toward Done; failed counts, if any, appear for
[Failed files & folder status](../04-failed-files-and-folder-status.md).

**Alternate paths**

- **Folder scan** / **Folder tree scan** Play → for a tree with partial coverage, a **Full
  scan** menu offers **Only detected changes** or **Full folder tree**; at 0% or 100% coverage
  Play starts a full tree scan immediately.
- Rotation Play with findings already present → **View wrongly rotated images** remains the way
  into [Wrongly rotated images review](../03-wrongly-rotated-images-review.md).

**Failure paths**

- Enqueue throws → the matching dock/legacy panel shows a failed status and the error message.

### J-08-01-3 — Fill in place names from GPS

**Trigger:** the user presses Play on **Geo-location**.
**Preconditions:** GPS detection may be off; some files may already have coordinates.

1. If the local GeoNames database is not present, **Download geolocation database?** explains
   that reverse geocoding uses about 2 GB; progress will show in Background operations.
2. Confirming enqueues geocoder init then reverse geocode for the folder tree.
3. Folder-scan Play is locked while geo is running, and the reverse while a folder scan is
   running.

**Outcome:** the geo card shows location-details completion and with/without GPS counts.

**Alternate paths**

- Nothing in scope has GPS → the dashboard omits the geo Play control (covered by
  `geo-location-folder-ai-summary.spec.ts`).

**Failure paths**

- User cancels the download dialog → nothing is enqueued.

### J-08-01-4 — Open from Insights and return to the hub

**Trigger:** Insights → **Folder analysis status**.
**Preconditions:** at least one library root.

1. With one root, the dashboard opens for that root (the hub heading stays hidden).
2. **Back to images** returns to the **Folder analysis status** hub showing that root's card.
3. With two roots, the hub is shown first; picking a card opens the dashboard.

**Outcome:** Insights remains the place to jump between library roots without hunting in the
tree.

### J-08-01-5 — Empty parent folder

**Trigger:** the user selects a folder with no direct media and at least one child folder.
**Preconditions:** **On empty folder selection show AI analysis status summary for subfolders**
is on (default).

1. The app opens the tree summary instead of the empty-grid message.
2. No automatic metadata scan starts because of this open.

**Outcome:** the user sees the tree's coverage immediately.

**Alternate paths**

- The setting is off → empty-grid copy plus a **Folder tree analysis summary** button.
