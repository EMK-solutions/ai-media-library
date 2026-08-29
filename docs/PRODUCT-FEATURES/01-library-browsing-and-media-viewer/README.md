---
id: M-01
title: Library Browsing & Media Viewer
status: shipped
last_reviewed: 2026-08-26
---

# Module 01 — Library Browsing & Media Viewer

> Point the app at folders you already have, browse what is in them, and look at any photo or
> video full screen with everything the app knows about it.

## 1. Purpose & value

This module is the front door of the product and the surface every other module eventually
shows its results on. The user adds one or more folders from their disk as **library roots**,
navigates the real folder structure in the sidebar, and sees the photos and videos inside as a
grid or a list. Nothing is imported, copied or moved: the app reads the files where they are,
and thumbnails stream directly from disk so a folder is browsable within seconds of being
selected — long before any AI has run over it.

From the grid the user opens the full-screen viewer to look at a single item, step through the
folder, run a slideshow, and open a side panel that shows the item's dates, place, rating, AI
description, faces and raw metadata. Rating, quick filtering and per-item actions live here
too, which makes this the module where the value produced by catalog scanning, image analysis,
face recognition and search actually becomes visible.

## 2. User stories

- **As a photo owner** I want to add a folder from my disk and see its contents immediately,
  **so that** I can confirm the app found my photos before committing to any processing.
- **As a browsing user** I want to move through folders the same way I do in my file manager,
  **so that** I do not have to learn a new organisation scheme.
- **As a viewer** I want to look at one photo full screen and step through the rest with the
  keyboard, **so that** reviewing a folder is fast.
- **As someone reviewing a shoot** I want to see a photo's date, place, description and faces
  next to the image, **so that** I can judge and rate it without leaving the viewer.
- **As a curator** I want to rate photos and narrow the grid to what matters,
  **so that** I can find the keepers in a large folder.

## 3. Feature index

| ID | Feature | Status | Primary screen | Doc |
|---|---|---|---|---|
| F-01-01 | Library roots & folder tree | shipped | Folders sidebar | [01-library-roots-and-folder-tree.md](01-library-roots-and-folder-tree.md) |
| F-01-02 | Folder media browsing | shipped | Media grid / list | [02-folder-media-browsing.md](02-folder-media-browsing.md) |
| F-01-03 | Media viewer & slideshow | shipped | Full-screen viewer | [03-media-viewer-and-slideshow.md](03-media-viewer-and-slideshow.md) |
| F-01-04 | Photo info panel | shipped | Viewer side panel | [04-photo-info-panel.md](04-photo-info-panel.md) |
| F-01-05 | Star rating | shipped | Grid card, list row, info panel | [05-star-rating.md](05-star-rating.md) |
| F-01-06 | Quick filters | shipped | Toolbar dropdown | [06-quick-filters.md](06-quick-filters.md) |
| F-01-07 | Media item actions | shipped | Item ⋮ menu | [07-media-item-actions.md](07-media-item-actions.md) |

## 4. Key journeys

| ID | Journey | Path through the product |
|---|---|---|
| J-01-1 | First look at a library | Add library root → expand tree → select folder → thumbnails stream in |
| J-01-2 | Review and rate a folder | Select folder → open viewer → step through with arrow keys → rate from the info panel |
| J-01-3 | Narrow a large folder | Select folder → open quick filters → pick people / rating / category → grid narrows |
| J-01-4 | Inspect one photo in depth | Open viewer → Info tab → Face tags tab → Metadata tab |
| J-01-5 | Act on a single item | Item ⋮ menu → add to album, find similar, show in File Explorer, copy path |

Cross-module flows, including the recommended setup order, are in [`../JOURNEYS.md`](../JOURNEYS.md).

## 5. Entry points & navigation

| Entry point | Leads to | Notes |
|---|---|---|
| Sidebar **Folders** | Folder tree and media workspace | The app's default section |
| Folder row click | That folder's media in the grid or list | Also clears any active search results |
| Thumbnail or list row click | Full-screen viewer at that item | Videos start playing if the auto-play setting is on |
| Toolbar grid/list toggle | Same items in the other layout | List adds a metadata-rich row per item |
| Toolbar quick filters | Filter dropdown | Filter count is shown next to the folder label |
| Item ⋮ menu | Per-item actions | Available on grid cards and list rows |
| Folder row ⋮ / right-click | Folder-level actions | Scanning and AI pipelines — owned by M-02, M-03, M-04, M-05 |

The window has one workspace visible at a time. Selecting Folders shows the toolbar plus the
media workspace; the viewer opens as a full-screen overlay above whatever is behind it.

## 6. Key concepts

| Term | Meaning in this module |
|---|---|
| Library root | A folder the user added; the top level of a tree in the sidebar |
| Folder tree | Sidebar hierarchy mirroring the real folders on disk |
| Media item | One photo or video shown in the grid |
| View mode | Grid or list presentation of the same items |
| Viewer | The full-screen overlay showing one item at a time |
| Info panel | The side panel inside the viewer, with Info, Face tags and Metadata tabs |
| Quick filters | Non-destructive narrowing of the current grid |
| Star rating | The user's own 0–5 rating, distinct from the AI quality rating |

Full definitions: [`../GLOSSARY.md`](../GLOSSARY.md).

## 7. Dependencies

**Depends on**

| Module | What it needs |
|---|---|
| [M-02 Catalog & Metadata](../02-catalog-and-metadata/README.md) | Dates, places, dimensions, ratings and file identity for every item shown |
| [M-03 AI Image Analysis](../03-ai-image-analysis/README.md) | Titles, descriptions, categories and quality ratings shown in the info panel and used by filters |
| [M-04 People & Faces](../04-people-and-faces/README.md) | Face boxes and person tags in the viewer's Face tags tab and the people quick filter |
| [M-11 Settings & Configuration](../11-settings-and-configuration/README.md) | Viewer behaviour: video auto-play, slideshow video handling, date format |

**Depended on by**

| Module | What it consumes |
|---|---|
| [M-05 Search & Discovery](../05-search-and-discovery/README.md) | Renders its results in the same grid, list and viewer |
| [M-06 Albums](../06-albums/README.md) | Album and smart album contents use the same grid, viewer and item menu |
| [M-07 Documents](../07-documents/README.md) | Opens a document in the same viewer |
| [M-08 Insights & Library Health](../08-insights-and-library-health/README.md) | Folder selection and the folder tree drive its scopes and review screens |

## 8. Settings owned

| Settings group (UI label) | Features affected |
|---|---|
| **Image / Video viewer** — auto-play video when opening viewer, skip videos in slideshow, date format | F-01-03, F-01-04 |

Other settings that change this module's behaviour (folder scanning, embedded metadata
write-back) are owned by [M-02](../02-catalog-and-metadata/README.md) and
[M-11](../11-settings-and-configuration/README.md).

## 9. Quality snapshot

| Type | Coverage |
|---|---|
| E2E | `apps/desktop-media/tests/e2e/folder-browsing.spec.ts` — add library root, select folder, thumbnails appear, viewer opens, removing a root does not delete files |
| E2E | `apps/desktop-media/tests/e2e/viewer.spec.ts` — keyboard navigation and close |
| E2E | `apps/desktop-media/tests/e2e/viewer-video.spec.ts` — video auto-play from grid, list and thumbnail strip; setting disables it; slideshow advances after a video ends |
| E2E | `apps/desktop-media/tests/e2e/viewer-info-panel.spec.ts` — info panel is populated on first open and after switching tabs |
| E2E | `apps/desktop-media/tests/e2e/viewer-face-tags-overlay-regression.spec.ts` — face overlay clears when moving to an image without faces |
| E2E | `apps/desktop-media/tests/e2e/quick-filters.spec.ts` — each filter narrows the grid and applies to search results |
| E2E | `apps/desktop-media/tests/e2e/sidebar-navigation.spec.ts` — section switching and sidebar collapse |
| Unit | `packages/media-store/src/slices/viewer.test.ts`, `packages/media-viewer/src/grid/media-item-star-rating.test.ts`, `apps/desktop-media/src/renderer/lib/photo-date-format.test.ts`, `.../media-metadata-lookup.test.ts` |

**Gaps:** no dedicated E2E for star rating changes, and quick filter logic is covered mostly at
the integration level rather than by unit tests of each filter predicate.

## 10. Known gaps & direction

- Multi-select exists in the shared store but the desktop UI exposes very little of it; bulk
  actions on a selection are effectively limited to album membership.
- List view shows richer metadata than grid view; there is no user control over which columns
  or badges appear.
- Very large folders rely on streaming rather than virtualised rendering, so extremely large
  directories stay slower than the rest of the app.
