# Product features

Functional documentation for the **AI Media Library** desktop application — what the product
does, for whom, and by which rules. Derived from the shipped code and kept in step with it.

- **How these documents are written:** [CONVENTIONS.md](CONVENTIONS.md)
- **Shared vocabulary:** [GLOSSARY.md](GLOSSARY.md)
- **End-to-end flows, including the recommended setup path:** [JOURNEYS.md](JOURNEYS.md)
- **Templates for new documents:** [`_templates/`](_templates/)

---

## 1. What the product is

A desktop application that turns a folder of photos and videos on a local disk into a
searchable, organised, people-aware library — with all AI running on the user's own machine.

The user points the app at folders they already have. It reads the files in place, builds a
local catalog of their metadata, and then runs a set of on-device AI pipelines over them:
understanding what each image shows, finding and recognising faces, and building a search
index that answers plain-language queries. Nothing is uploaded, no account is required, and
the original files are never moved or rewritten unless the user explicitly asks for it.

**What makes it different**

| | |
|---|---|
| **Local-first** | Files stay where they are; the catalog and all AI results live on the same machine. |
| **Offline AI** | Image understanding, face recognition and semantic search run against locally hosted models. |
| **Non-destructive** | The app reads files; it writes to them only on explicit user action. |
| **Folder-native** | The user's existing folder structure is the primary organisation; albums and smart albums are added on top. |
| **Progressive** | Each pipeline is optional and independently useful; the library is usable long before everything has been analysed. |

**Who it is for**

| User | What they need |
|---|---|
| **Photo owner / archivist** | Decades of photos across disks, no reliable way to find anything in them. |
| **Family organiser** | Wants photos grouped by the people in them, and a way to show them on a TV. |
| **Privacy-conscious user** | Rejects cloud photo services but wants the capability they offer. |
| **Household administrator** | Needs to find a receipt or invoice photographed months ago. |

---

## 2. Module map

| ID | Module | What it gives the user |
|---|---|---|
| M-01 | [Library Browsing & Media Viewer](01-library-browsing-and-media-viewer/README.md) | Add folders, browse and rate photos and videos, view them full screen with their details |
| M-02 | [Catalog & Metadata](02-catalog-and-metadata/README.md) | Build and maintain the catalog: scan folders, read EXIF/XMP, resolve dates and places, track file changes |
| M-03 | [AI Image Analysis](03-ai-image-analysis/README.md) | Understand what each image shows: title, description, category, quality, orientation, document data |
| M-04 | [People & Faces](04-people-and-faces/README.md) | Find faces, learn who people are, and tag photos by person |
| M-05 | [Search & Discovery](05-search-and-discovery/README.md) | Find photos by describing them, filter results, and pivot to visually similar images |
| M-06 | [Albums](06-albums/README.md) | Hand-curated albums and automatically derived smart albums |
| M-07 | [Documents](07-documents/README.md) | Photographed invoices and receipts as a searchable, filterable table |
| M-08 | [Insights & Library Health](08-insights-and-library-health/README.md) | See what has been processed, find duplicates, fix wrongly rotated photos, retry failures |
| M-09 | [Background Processing](09-background-processing/README.md) | Queue, monitor, cancel and pace the long-running AI jobs |
| M-10 | [Sharing & Presentation](10-sharing-and-presentation/README.md) | Broadcast a folder or album to a TV on the same network |
| M-11 | [Settings & Configuration](11-settings-and-configuration/README.md) | Tune models, thresholds, scanning behaviour and hardware use |
| M-12 | [Onboarding & Help](12-onboarding-and-help/README.md) | First-run introduction, in-context guided help, AI model transparency |
| M-13 | [Platform & Distribution](13-platform-and-distribution/README.md) | Install, update, provision local AI runtimes, and where data is kept |

---

## 3. How the modules fit together

```
                     ┌─────────────────────────────────────────────┐
                     │  M-01 Library Browsing & Media Viewer       │  what the user sees
                     └────────────────────┬────────────────────────┘
                                          │ reads
                     ┌────────────────────┴────────────────────────┐
                     │  M-02 Catalog & Metadata                    │  the source of truth
                     └────────────────────┬────────────────────────┘
                                          │ feeds
        ┌─────────────────┬───────────────┼──────────────────┬──────────────────┐
        │                 │               │                  │                  │
┌───────┴──────┐ ┌────────┴──────┐ ┌──────┴───────┐ ┌────────┴──────┐ ┌─────────┴──────┐
│ M-03 AI      │ │ M-04 People   │ │ M-05 Search  │ │ M-06 Albums   │ │ M-08 Insights  │
│ Image        │ │ & Faces       │ │ & Discovery  │ │               │ │ & Library      │
│ Analysis     │ │               │ │              │ │               │ │ Health         │
└───────┬──────┘ └────────┬──────┘ └──────┬───────┘ └───────────────┘ └────────────────┘
        │                 │               │
        │ produces        │ produces      │ consumes both
        └────────> M-07 Documents         │
                                          │
     All long-running work is queued and reported by  M-09 Background Processing
     All behaviour is tuned through                   M-11 Settings & Configuration
     Introduced and explained by                      M-12 Onboarding & Help
     Delivered and kept running by                    M-13 Platform & Distribution
     Presented outside the app by                     M-10 Sharing & Presentation
```

**The dependency that matters most:** nothing works until the catalog exists. Adding a folder
makes photos visible, but search, people, albums, filters and insights all read the catalog
built by M-02. See [JOURNEYS.md](JOURNEYS.md) for the order this implies for a new user.

---

## 4. Navigation map

The app has a single window: a sidebar of sections on the left, one workspace at a time on the
right, a progress dock at the bottom, and a full-screen viewer over everything.

| Sidebar section | Workspace | Module |
|---|---|---|
| **Folders** | Folder tree, media grid or list, AI search results, folder AI summary | M-01, M-02, M-05 |
| **Albums** | Album list, album detail, smart album browsing | M-06 |
| **People** | People directory, People groups, Tagged faces, Untagged faces | M-04 |
| **Documents** | Invoices & Receipts table | M-07 |
| **Insights** | Folder analysis status, Wrongly rotated images, Duplicate files | M-08 |
| **Settings** | All configuration sections | M-11 |
| *(bottom dock)* | Background operations: running, queued and recent jobs | M-09 |
| *(overlay)* | Photo and video viewer with Info, Face tags and Metadata tabs | M-01, M-04 |

---

## 5. Where other documentation lives

| Folder | Contains |
|---|---|
| `docs/END-USER-GUIDE/` | Non-technical overview and install instructions for end users |
| `docs/ARCHITECTURE/` | System design and technical structure |
| `docs/IMPLEMENTATION-LOG/` | Delivery records: features, bug fixes, refactoring |
| `docs/ROADMAP/` | Planned and considered work |
