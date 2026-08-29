# Glossary

Shared vocabulary for product documentation. Where a term the user sees differs from the term
used in code, both are given — documentation always uses the user-facing term.

---

## Library and files

**Library root** — a folder on disk the user has added to the app. The app reads its contents
in place and never moves or copies files out of it. Removing a library root removes it from
the app only; the files stay on disk.

**Folder tree** — the sidebar hierarchy of library roots and their subfolders. It mirrors the
real folder structure on disk.

**Media item** — one photo or video known to the app. Identified by its file path, and tracked
across renames and moves by content.

**Catalog** — the local database of everything the app knows about the user's media: file
facts, dates, places, ratings, AI results, faces. Built by the folder scan.

**On disk vs in the catalog** — a file exists on disk whether or not the app knows about it.
It enters the catalog only when a folder scan reads it.

---

## Scanning and metadata

**Folder scan** — reading files in a folder to create or update their catalog entries. Called
"Scan for file changes" in the UI.

**Full scan** — reads every file in scope, regardless of whether it changed.

**Incremental scan** — reads only files that appear new, changed, moved or deleted since the
last scan.

**Quick scan** — a fast comparison of the folder tree against the catalog to report what
differs, without reading file contents.

**EXIF / XMP** — metadata standards embedded in image files by cameras and editing software.
The source of capture dates, camera settings, GPS coordinates and star ratings.

**Scan freshness** — how long ago a folder was scanned, used to mark folders as possibly
outdated (default: after 30 days).

**Write-back** — writing a value the user changed in the app (such as a star rating) back into
the original file's embedded metadata. Off by default; the app is read-only otherwise.

---

## AI processing

**Pipeline** — one kind of long-running AI or scanning work that can be run over a folder:
folder scan, face detection, AI image analysis, search indexing, rotation detection and
others.

**Job** — one run of a pipeline over a specific folder.

**Bundle** — a group of jobs enqueued together, so related pipelines run in the right order.

**Queue** — the ordered list of jobs waiting to run. Jobs run under concurrency limits per
resource type so the machine stays usable.

**Progress dock** — the collapsible panel at the bottom of the window showing running, queued
and recently finished jobs. Labelled "Background operations".

**Missing only vs all** — pipeline run modes. "Missing only" processes items that have no
result yet; "all" reprocesses everything in scope.

**Coverage** — the share of media items in a folder that a given pipeline has completed.

**Invalidation** — discarding AI results for a file because the file itself changed in a way
that makes them wrong (different content, dimensions or orientation). Benign changes such as a
rating edit do not invalidate.

---

## Image understanding

**AI image analysis** — the pipeline that looks at each image with a local vision model and
writes a title, description, category, quality assessment and, when enabled, invoice data.

**Image category** — the kind of image the model believes it is: photo, screenshot, document,
invoice or receipt, presentation slide, diagram and similar. Used by filters and by smart
album exclusions.

**AI rating / quality** — the model's assessment of an image's photographic quality, distinct
from the user's own star rating.

**Star rating** — the user's own rating from 1 to 5 stars, with 0 meaning unrated. Read from
embedded metadata during a scan and editable in the app.

**Edit suggestions** — cropping and adjustment recommendations produced during AI image
analysis.

**Rotation detection** — checking whether an image is stored the wrong way up, so that later
pipelines (and the user) see it correctly oriented.

---

## People and faces

**Face detection** — finding the faces present in an image and recording where they are.

**Face instance** — one detected face in one photo. A photo can contain many; the same person
appears as a separate face instance in every photo they are in.

**Face recognition** — deciding which known person a detected face most likely is, by
comparing its visual signature against the examples the user has already tagged.

**Person** (also **person tag**) — a named individual the user has created. Photos are tagged
by attaching a face instance to a person.

**Tagged face** — a face instance the user has confirmed belongs to a specific person.

**Untagged face** — a detected face not yet attached to any person.

**Suggested match** — an untagged face the app believes belongs to a known person, offered for
the user to confirm or decline. Confirming improves later suggestions.

**Unconfirmed face** — a suggested match the user has not acted on. Search can optionally
include these when filtering by person, widening results at the cost of precision.

**Face group** — a cluster of untagged faces that look like the same unknown person, so the
user can name them all at once.

**Main subject vs background face** — whether a detected face is a subject of the photo or an
incidental bystander, judged by its size relative to the other faces and the frame.

---

## Search

**AI image search** — finding photos by describing them in plain language, rather than by file
name or folder.

**Search index** — the visual signatures the app computes per image so that a text description
can be matched against them. Built by the "Index images for AI search" pipeline.

**Description matching** — a second search signal that compares the query against the titles
and descriptions written by AI image analysis.

**Hybrid search** — combining visual matching and description matching into a single ranked
result list.

**Similarity threshold** — the minimum match strength for a result to be shown. Results below
it are hidden rather than shown as weak matches.

**Search scope** — whether a search covers the whole library, the selected folder, or the
selected folder and everything beneath it.

**Find similar** — starting from one photo and finding the images that look most like it.

---

## Organisation

**Album** — a hand-curated, ordered set of media items with a title and a cover image. An item
can belong to several albums; adding it to an album does not move the file.

**Smart album** — a set derived automatically from the catalog rather than curated by hand:
by place, by year, or "best of" a person, group or year.

**People group** — a named set of people (for example a family), used to filter and to build
smart albums about several people at once.

**Quick filters** — the fast, non-destructive narrowing controls above the grid: people, star
rating, AI rating, category, documents, dates, location.

---

## Library health

**Duplicate files** — files whose contents are identical, found by comparing content hashes.
Reviewed by folder or by file before anything is deleted.

**Wrongly rotated image** — an image the app believes is stored at the wrong orientation, with
a suggested correction the user can apply or dismiss.

**Failed file** — a media item a pipeline could not process, listed so it can be retried.

**Folder status indicator** — the colour and icon on a folder row summarising how far its
media has been processed.

---

## Platform

**Local AI runtime** — the locally installed model infrastructure the app depends on: Ollama
for vision and language models, and bundled on-device models for faces and search indexing.

**Model provisioning** — downloading and preparing the on-device models on first run or on
demand.

**App data location** — where the catalog database, models, location database and caches are
stored, shown in Settings.

**TV broadcast** — serving a folder or album as a slideshow to a browser on another device on
the same local network, optionally protected by a PIN.
