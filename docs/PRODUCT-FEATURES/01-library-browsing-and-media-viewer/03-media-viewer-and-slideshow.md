---
id: F-01-03
module: 01-library-browsing-and-media-viewer
title: Media viewer & slideshow
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - packages/media-viewer/src/swiper-viewer.tsx
  - packages/media-store/src/slices/viewer.ts
  - apps/desktop-media/src/renderer/hooks/use-desktop-viewer-bridge.ts
  - apps/desktop-media/src/renderer/components/DesktopSwiperInfoPanel.tsx
related:
  - F-01-02
  - F-01-04
  - F-01-05
  - F-10-01
---

# Media viewer & slideshow

> Open any photo or video full screen, step through the surrounding items, and play the set as
> a slideshow.

## 1. Summary

The viewer is a full-screen overlay that shows one media item at a time above whatever the
user was looking at. It opens from a thumbnail, a list row, a search result, an album, a
document row or a face in the People workspace, and it always carries the surrounding set with
it — so the user can keep moving through the same list without going back. A vertical
thumbnail strip on the left gives position and one-click jumps, arrow controls and keyboard
keys move between items, and a play control turns the set into an unattended slideshow.

Videos play inline with standard controls. The viewer knows the difference between photos and
videos: a slideshow waits for a video to finish before advancing, unless the user has asked
for videos to be skipped. The side info panel (documented separately in
[Photo info panel](04-photo-info-panel.md)) opens over the right-hand part of the frame
without closing the viewer.

## 2. User stories

- **As someone reviewing a folder** I want to open one photo and move through the rest with
  the arrow keys, **so that** I can go through a shoot quickly.
- **As a viewer of my own archive** I want to start a slideshow and stop touching the machine,
  **so that** I can watch photos rather than operate an app.
- **As someone checking a search result** I want to open a result full screen and step through
  the neighbouring results, **so that** I can judge whether the search found what I meant.
- **As a person with mixed photo and video folders** I want videos to play in place with
  normal controls, **so that** I do not need a separate player.

## 3. Scope

**In scope**

- Full-screen presentation of photos and videos, with fit-to-frame sizing
- Navigation: previous/next controls, keyboard, thumbnail strip
- Slideshow play/pause, including how videos are handled
- Browser fullscreen mode
- Which set of items the viewer carries, and where it opens from
- Video playback behaviour, including auto-play on open

**Out of scope**

- The contents of the side panel — see [Photo info panel](04-photo-info-panel.md)
- Rating controls — see [Star rating](05-star-rating.md)
- Face boxes and tagging inside the viewer — see
  [Face tagging & suggestions](../04-people-and-faces/06-face-tagging-and-suggestions.md)
- Editing, cropping or rotating an image from the viewer

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Which items the grid produced in the first place | [Folder media browsing](02-folder-media-browsing.md) |
| Playing a set on a TV rather than in the app | [TV broadcast](../10-sharing-and-presentation/01-tv-broadcast.md) |
| Viewer-related settings UI | [Settings screen](../11-settings-and-configuration/01-settings-screen.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-01-03.1 | Full-screen presentation | One item filling the frame, sized to fit without excessive upscaling | shipped |
| F-01-03.2 | Item navigation | Previous/next buttons, keyboard keys, and a thumbnail strip with the current item highlighted | shipped |
| F-01-03.3 | Slideshow | Play/pause; photos advance on a timer, the strip and controls get out of the way | shipped |
| F-01-03.4 | Video playback | Inline player with controls; optional auto-play when a video is opened | shipped |
| F-01-03.5 | Fullscreen mode | Enter and exit the OS/browser fullscreen for the viewer surface | shipped |
| F-01-03.6 | Carried item set | The viewer travels with the list it was opened from — folder, search results, album, or a person's photos | shipped |

## 5. User journeys

### J-01-03-1 — Step through a folder

**Trigger:** the user clicks a thumbnail in the media grid.
**Preconditions:** a folder is selected and its items are listed.

1. The viewer opens full screen at the clicked item, with the folder's items loaded around it.
2. The user presses the right arrow key, or clicks the next control, to advance.
3. The thumbnail strip scrolls to keep the current item visible and highlighted.
4. The user clicks a thumbnail in the strip to jump several items at once.
5. The user presses the close control to return to the grid, in the same scroll position.

**Outcome:** the user has reviewed part of a folder without leaving the viewer.

**Alternate paths**

- Opened from a search result, album or document row → the viewer carries that list instead of
  the folder's contents.
- Opened from a face in the People workspace → the viewer carries the photos of that person and
  opens on the Face tags tab.
- Only one item in the set → the previous/next controls are inert.

### J-01-03-2 — Watch a folder as a slideshow

**Trigger:** the user presses play in the viewer.

1. The thumbnail strip hides, and the navigation, info and close controls are withdrawn so the
   image is unobstructed.
2. Each photo is shown for a fixed interval, then the viewer advances.
3. When the set reaches a video, playback starts and the slideshow waits for it to end before
   advancing — unless **Skip videos in slideshow** is enabled, in which case the video is
   passed over immediately.
4. The user presses pause to stop; controls and the strip return.

**Outcome:** the set has been presented hands-free.

**Alternate paths**

- The info panel is open when play is pressed → the panel closes so the slideshow is
  unobstructed.
- The user wants the slideshow on a television instead →
  [TV broadcast](../10-sharing-and-presentation/01-tv-broadcast.md) serves the same set to
  another device.

### J-01-03-3 — Open a video

**Trigger:** the user clicks a video thumbnail.

1. The viewer opens with the video and standard playback controls.
2. If **Auto-play video when opening viewer** is enabled (the default), playback starts as
   soon as the video is ready.
3. Moving to another item pauses the video.

**Outcome:** the video played without a separate application.

**Failure paths**

- The file cannot be decoded by the embedded player → the frame stays empty and the controls
  are inert; the user can still reach the file through
  [Media item actions](07-media-item-actions.md) → Show in File Explorer.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Viewer overlay | Click a thumbnail, list row, search result, album item, document row, or a face in People | Thumbnail strip, main frame, top-left play and fullscreen controls, top-right info and close controls, edge navigation arrows | `packages/media-viewer/src/swiper-viewer.tsx` |
| Slideshow mode | Play control inside the viewer | Main frame only; strip and secondary controls hidden | same |
| Info panel | Info control inside the viewer | Panel occupying the right of the frame; main image reflows to the left | `apps/desktop-media/src/renderer/components/DesktopSwiperInfoPanel.tsx` |

**States**

| State | What the user sees |
|---|---|
| Empty set | The viewer does not open at all |
| Item not yet loaded | Neighbouring slides render as a neutral placeholder until they come into range |
| Video not yet loaded | A "Video" placeholder in the strip and frame until the file is prepared |
| Slideshow running | Controls and strip withdrawn; only the media is visible |

**UX notes**

- Images are fitted to the frame rather than upscaled without limit, so small images are not
  blown up into obvious blur.
- Only slides near the current index load their real media, which keeps a folder of hundreds
  of videos from being fetched at once.
- Every control has a text label for assistive technology, and the thumbnail strip marks the
  active item with `aria-current`.
- The viewer renders into a portal above the whole app, so the bottom progress dock is hidden
  while it is open — background jobs keep running regardless.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | The viewer opens only when the carried set contains at least one item. | Prevents an empty overlay the user has to dismiss. | `packages/media-viewer/src/swiper-viewer.tsx` |
| BR-2 | Navigation wraps around the ends of the set when the info panel is open, and follows the carousel otherwise. | Keeps stepping continuous during review while preserving carousel physics in normal viewing. | `packages/media-viewer/src/swiper-viewer.tsx` |
| BR-3 | Starting the slideshow closes the info panel. | The slideshow is a presentation mode; a metadata panel contradicts it. | `packages/media-viewer/src/swiper-viewer.tsx` |
| BR-4 | In a slideshow, a photo advances after a fixed display interval; a video advances when playback ends. | A video cut off mid-play is worse than a slightly uneven cadence. | `packages/media-viewer/src/swiper-viewer.tsx` |
| BR-5 | When **Skip videos in slideshow** is enabled, videos are passed over without playing. | Some users want a photo-only presentation. | `apps/desktop-media/src/shared/ipc.ts` (`DEFAULT_MEDIA_VIEWER_SETTINGS`) |
| BR-6 | Auto-play applies only to the video the viewer was opened on, unless selection auto-play is enabled by the caller. | Prevents every video from starting as the user steps through a mixed folder. | `packages/media-viewer/src/swiper-viewer.tsx` |
| BR-7 | Changing slide pauses any playing video. | Sound continuing from an off-screen video is disorienting. | `packages/media-viewer/src/swiper-viewer.tsx` |
| BR-8 | Closing the viewer resets the info panel, the active tab, the selected face and the carried item override. | The next open starts from a predictable state rather than inheriting the last session. | `packages/media-store/src/slices/viewer.ts` |
| BR-9 | Only slides within two positions of the current item load their media; thumbnail-strip videos load within six positions or when scrolled into view. | Keeps large folders responsive. | `packages/media-viewer/src/swiper-viewer.tsx` |
| BR-10 | Images are scaled to fit the frame, with upscaling capped, and cover-fitting used only when the aspect mismatch is small. | Avoids both letterboxing waste and heavy cropping. | `packages/media-viewer/src/viewer-image-fit.ts` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| Auto-play video when opening viewer | On | The video the viewer opened on starts playing automatically | No |
| Skip videos in slideshow | Off | Slideshow passes over videos instead of playing them | No |
| Date format | `DD.MM.YYYY` | Formats dates shown in the info panel | No |

Defined in `apps/desktop-media/src/shared/ipc.ts` (`DEFAULT_MEDIA_VIEWER_SETTINGS`); surfaced
in Settings → **Image / Video viewer**.

## 9. Data & persistence

The viewer holds no persistent data of its own. Its state — open, current index, source,
panel visibility, active tab, carried item list — lives in the session only, and is cleared
when the viewer closes. Anything the user changes while viewing (a star rating, a face tag) is
persisted by the feature that owns it.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| Files present on disk at their catalogued path | Rendering the image or video | An empty frame; the item is reconciled on the next folder scan |
| [Folder media browsing](02-folder-media-browsing.md) | Producing the carried item set | The viewer cannot be opened |
| Viewer settings from [M-11](../11-settings-and-configuration/README.md) | Auto-play, slideshow and date behaviour | Shipped defaults apply |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `openViewer` | `index`, `source`, `{ showInfoPanel, activeInfoTab, itemListOverride, autoPlayInitialVideo }` | Open the viewer on a specific item of a specific set |
| `closeViewer` | — | Close and reset viewer state |
| `setViewerCurrentIndex` | `index` | Move to a specific item |
| `toggleViewerInfoPanel` / `setViewerShowInfoPanel` | `show` | Show or hide the side panel |
| `setViewerActiveInfoTab` | `tab` | Select Info, Face tags or Metadata |
| `setViewerSelectedFaceIndex` | `index \| null` | Highlight a specific face on the current photo |

Defined in `packages/media-store/src/slices/viewer.ts`; the desktop wiring that decides which
set to carry is in `apps/desktop-media/src/renderer/hooks/use-desktop-viewer-bridge.ts`.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/viewer.spec.ts` | Opens from the grid, arrow-key navigation, close control |
| E2E | `apps/desktop-media/tests/e2e/viewer-video.spec.ts` | Auto-play from grid, list and thumbnail strip; the setting disabling it; slideshow advancing after a video ends |
| E2E | `apps/desktop-media/tests/e2e/viewer-info-panel.spec.ts` | Panel opens populated and stays populated across tab switches; closing restores the toolbar control |
| E2E | `apps/desktop-media/tests/e2e/viewer-face-tags-overlay-regression.spec.ts` | Face boxes are cleared when moving to an image with no faces |
| Unit | `packages/media-store/src/slices/viewer.test.ts` | Open/close/index state transitions and reset behaviour |

**Coverage gaps:** slideshow timing, the image fit rules, and the near-slide loading window
have no dedicated automated coverage.

## 13. Known limitations & open questions

- **Limitation:** the slideshow photo interval is fixed and not exposed as a setting.
- **Limitation:** there is no zoom or pan; an image is shown fitted to the frame only.
- **Limitation:** the viewer offers no editing actions, so a photo identified as wrongly
  rotated must be fixed through
  [Wrongly rotated images review](../08-insights-and-library-health/03-wrongly-rotated-images-review.md).
- **Open question:** whether the slideshow should continue past the end of the carried set
  (loop) or stop — current behaviour follows the carousel and wraps.

## 14. References

- Module: [Library Browsing & Media Viewer](README.md)
- [Folder media browsing](02-folder-media-browsing.md) — where the carried set comes from
- [Photo info panel](04-photo-info-panel.md) — the side panel's contents
- [TV broadcast](../10-sharing-and-presentation/01-tv-broadcast.md) — the same set on a TV
- Implementation history: `docs/IMPLEMENTATION-LOG/bugs/2026-03_fix_info_panel_initial_stale_state_*.plan.md`
