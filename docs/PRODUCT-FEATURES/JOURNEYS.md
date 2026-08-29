# Cross-module user journeys

End-to-end flows that cross module boundaries. Each module documents its own journeys; this
file describes the paths a real user actually takes through the whole product.

`J-X1` is the **recommended path** — the order the product is designed to be adopted in, and
the sequence guided help and onboarding steer towards.

---

## J-X1 — Recommended setup path (first library)

> The order matters. Each step makes the next one better, and the slowest pipeline runs last
> so the user gets useful capability early instead of waiting hours for the first result.

**Who:** a new user who has just installed the app and has photos on a local disk.
**Outcome:** a searchable, people-aware, fully described library, reached in stages where
every stage is independently useful.

### Step 0 — Install and first run

Install the app and let the welcome wizard run. It explains what the product does and points
at the AI models reference. In the background the app downloads the face and search models it
needs; Ollama must be installed separately for image analysis and query understanding.

- Modules: [Onboarding & Help](12-onboarding-and-help/README.md),
  [Platform & Distribution](13-platform-and-distribution/README.md)
- **Recommendation:** confirm Ollama is running before starting step 5 — the other steps do
  not need it.

### Step 1 — Add a folder with media files

Add a library root from the Folders sidebar and select a folder in the tree. The grid streams
thumbnails straight from disk, so the user sees their photos immediately, before any AI runs.

- Module: [Library Browsing & Media Viewer](01-library-browsing-and-media-viewer/README.md)
- **Recommendation:** start with **one modest folder** (a few hundred files) rather than an
  entire archive. Every later step is faster to validate, and the settings that matter become
  obvious before they are applied to tens of thousands of files.

### Step 2 — Run the folder scan (catalog the metadata)

Run **Scan for file changes** on the folder, with subfolders included if the tree is nested.
The scan reads EXIF/XMP from every file and builds the catalog: dimensions, capture dates,
camera data, GPS coordinates, star ratings, file identity. Nothing else in the product works
properly until this has run — search, faces, albums and filters all read the catalog.

- Module: [Catalog & Metadata](02-catalog-and-metadata/README.md)
- **Recommendation:** turn on **GPS location detection** in Settings *before* the first scan
  if the photos have coordinates. Place names are then resolved during the same pass instead
  of requiring a second run. The first activation downloads a large location database, so do
  it while attention is on setup.
- After the scan, the folder's status indicators in the sidebar and the folder analysis
  dashboard show what the library now contains and what has not been processed yet.

### Step 3 — Index the folder for AI search

Run **Index images for AI search**. This is the fastest of the AI pipelines and it delivers
the most visible payoff: the user can immediately describe a photo in their own words
("boat at sunset", "birthday cake") and find it, without any per-image text having been
written yet.

- Module: [Search & Discovery](05-search-and-discovery/README.md)
- **Recommendation:** try two or three searches as soon as the index finishes. This is the
  step that shows the user what the product is for, and it validates that the model stack is
  working before committing to longer jobs.

### Step 4 — Detect faces, then teach the app who people are

Run **Face detection** on the folder. It finds faces, and prepares each one for recognition.
Then build the people directory:

1. Open **People → People** and add the people who matter, by name.
2. Open a photo, use the **Face tags** tab, and tag a handful of faces per person by hand.
   Tag **at least three to five clearly visible faces per person** — recognition quality
   depends directly on how many good examples each person has.
3. Return to **People → Tagged faces**. The app proposes visually similar untagged faces for
   the selected person; confirm the correct ones and decline the rest. Each confirmation
   sharpens the next round of suggestions.
4. Use **People → Untagged faces → Find groups** to have remaining unknown faces grouped by
   similarity, then assign a whole group to a person in one action.

- Module: [People & Faces](04-people-and-faces/README.md)
- **Recommendation:** work one person at a time, and start with the person who appears most
  often — the payoff per confirmation is highest, and the resulting people filters make
  everything downstream (search, smart albums) more useful.
- Wrong-rotation detection runs ahead of face detection by default; leaving it enabled means
  sideways photos still get their faces found.

### Step 5 — Run AI image analysis last

Run **Image AI analysis** on the folder. Every image is sent to a local vision model, which
writes a title, description, category, quality assessment and — when enabled — invoice and
receipt data. This is by far the slowest pipeline: seconds to a minute per image depending on
hardware and model.

- Module: [AI Image Analysis](03-ai-image-analysis/README.md)
- **Recommendation:** start it when the machine is otherwise free — overnight, or on a folder
  at a time. The queue survives navigation, so the user can keep browsing while it runs.
- What it unlocks: text descriptions in the info panel, category and rating quick filters, the
  Documents workspace, smart album category exclusions, and a second search signal
  (description matching) that complements the visual index from step 3.

### Step 6 — Review and tidy (optional, any time after step 2)

With the catalog built, the Insights module can report on library health: duplicate files,
photos the app believes are rotated incorrectly, and files that failed a pipeline.

- Module: [Insights & Library Health](08-insights-and-library-health/README.md)

### Step 7 — Organise and share

Group photos into manual albums, browse the smart albums the product derives automatically
from place, year, people and rating, and broadcast a folder or album to a TV on the same
network.

- Modules: [Albums](06-albums/README.md),
  [Sharing & Presentation](10-sharing-and-presentation/README.md)

### Repeating for the rest of the library

Once the small folder has proven the setup, repeat steps 2–5 per folder or per library root.
The pipeline queue runs jobs in order with concurrency limits, so several folders can be
enqueued and left to finish.

- Module: [Background Processing](09-background-processing/README.md)

---

## J-X2 — Find a specific photo

**Trigger:** the user remembers something about a photo but not where it is.

1. Type a description into AI image search — the query is matched against both the visual
   index and AI-written descriptions.
2. Narrow with quick filters: people, star rating, AI quality rating, category, dates,
   location.
3. Restrict scope to the selected folder, or search the whole library.
4. Open a result in the viewer; use **Find similar** from the item menu to pivot to visually
   related photos.

Modules: [Search & Discovery](05-search-and-discovery/README.md),
[Library Browsing & Media Viewer](01-library-browsing-and-media-viewer/README.md).

**Depends on:** step 3 of J-X1 for visual search, step 5 for description matching, step 4 for
people filters.

---

## J-X3 — Curate an album, then present a folder on a TV

1. Select photos in a folder or search result and add them to an album from the item menu.
2. Open the album, reorder the items, set a cover image. Album playback stays in the app
   viewer.
3. To show photos on a television, select the folder in the tree and start a broadcast from
   the toolbar. The app serves **that folder** (not the album) over the local network and
   shows a URL and PIN.
4. Open the URL on the TV browser, enter the PIN, and run the slideshow.

Modules: [Albums](06-albums/README.md),
[Sharing & Presentation](10-sharing-and-presentation/README.md).

---

## J-X4 — Clean up a disorganised library

1. Run the folder scan so the catalog reflects what is actually on disk.
2. Run a duplicate file scan and review matches by folder or by file; mark and delete the
   copies that are not needed.
3. Open the wrongly rotated images review and apply or dismiss each suggested rotation.
4. Check the folder analysis dashboard for files that failed a pipeline and re-run them.

Modules: [Insights & Library Health](08-insights-and-library-health/README.md),
[Catalog & Metadata](02-catalog-and-metadata/README.md).

---

## J-X5 — Keep the library current after adding new files

1. Re-run the folder scan; the incremental scan detects new, changed, moved and deleted files.
2. Folder pipeline status and the folder analysis dashboard update to show what is still
   missing.
3. Re-run the AI pipelines in **missing only** mode so processed files are not repeated.
4. Confirm the newly suggested face matches for people who are already known.

Modules: [Catalog & Metadata](02-catalog-and-metadata/README.md),
[Background Processing](09-background-processing/README.md),
[People & Faces](04-people-and-faces/README.md).

---

## J-X6 — Find an invoice or receipt

1. With AI image analysis complete and invoice extraction enabled, open
   **Documents → Invoices & Receipts**.
2. Filter by issuer, date range or amount.
3. Open the document in the viewer to check the original image against the extracted values.

Modules: [Documents](07-documents/README.md),
[AI Image Analysis](03-ai-image-analysis/README.md).

---

## Journey dependency map

```
Add folder ──> Folder scan ──┬──> AI search index ──> Contextual search
                             │
                             ├──> Face detection ──> Tag people ──> Confirm matches ──> People filters
                             │
                             ├──> AI image analysis ──> Descriptions, categories, ratings, documents
                             │
                             ├──> Duplicate scan / rotation review
                             │
                             └──> Albums, smart albums, TV broadcast
```

Everything downstream of the folder scan can run in any order; the sequence in J-X1 is chosen
so the user gets value soonest and waits for the slowest pipeline last.
