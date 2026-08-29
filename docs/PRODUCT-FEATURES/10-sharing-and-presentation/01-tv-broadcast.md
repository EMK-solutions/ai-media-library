---
id: F-10-01
module: 10-sharing-and-presentation
title: TV broadcast
status: shipped
last_reviewed: 2026-08-26
source_of_truth:
  - apps/desktop-media/electron/tv-broadcast-server.ts
  - apps/desktop-media/electron/ipc/tv-broadcast-handlers.ts
  - apps/desktop-media/electron/tv-broadcast-client-html.ts
  - apps/desktop-media/src/renderer/components/tv-broadcast/TvBroadcastDialogs.tsx
  - apps/desktop-media/src/renderer/actions/tv-broadcast-actions.ts
related:
  - F-01-03
  - F-11-01
  - F-12-02
---

# TV broadcast

> Host the selected folder as a private page on your home network so a Smart TV browser can
> play it as a slideshow.

## 1. Summary

TV broadcast turns the computer into a short-lived local web server for one folder. The user
starts it from the Folders toolbar, confirms, and is shown a LAN address plus a four-digit PIN.
On the TV they type that address into the built-in browser, enter the PIN, and the page opens
the same kind of slideshow the desktop viewer uses — play on by default, no swipe, no info
panel. Stopping the broadcast shuts the server and invalidates sessions immediately.

Only one broadcast can run at a time. The playlist is the images and videos sitting **in that
folder**, not its subfolders and not an album.

## 2. User stories

- **As a host** I want a TV icon on the folder I am browsing, **so that** putting photos on
  the big screen is one confirmation, not a separate app.
- **As a guest watching the TV** I want a PIN before any photo loads, **so that** knowing the
  URL is not enough to see the album.
- **As someone on a trusted network** I want to turn the PIN off, **so that** testing on a
  phone browser is faster.
- This is **not** for sending photos to people outside the house, or for casting via Chromecast.

## 3. Scope

**In scope**

- Start / stop a single-folder LAN HTTP broadcast
- PIN gate (default on), session cookie, playlist and media URLs
- TV page: PIN form, Photo Viewer slideshow, D-Pad / arrow keys when paused
- Settings: enable (hides the toolbar icon), PIN required, TCP port
- In-dialog Help wizard

**Out of scope**

- Broadcasting an album, search results, or a person
- Subfolder recursion, mDNS names, Chromecast / DLNA / AirPlay
- Remote access over the internet

**Handled elsewhere**

| Concern | Owned by |
|---|---|
| Slideshow timing and skip-videos behaviour | [Media viewer & slideshow](../01-library-browsing-and-media-viewer/03-media-viewer-and-slideshow.md) |
| Settings page chrome | [Settings screen](../11-settings-and-configuration/01-settings-screen.md) |
| Help slide shell | [Guided help](../12-onboarding-and-help/02-guided-help.md) |

## 4. Sub-features

| ID | Sub-feature | What the user gets | Status |
|---|---|---|---|
| F-10-01.1 | Toolbar start / stop | TV icon on the Folders toolbar; confirm dialogs | shipped |
| F-10-01.2 | LAN URL and PIN | Address and 4-digit PIN after a successful start | shipped |
| F-10-01.3 | PIN gate | TV must authenticate before playlist or media | shipped |
| F-10-01.4 | TV slideshow page | Inline viewer, slideshow on, fullscreen on open | shipped |
| F-10-01.5 | Broadcast settings | Enable, PIN, port 1024–65535 (default 8787) | shipped |

## 5. User journeys

### J-10-01-1 — Broadcast a folder to the TV

**Trigger:** the user clicks the TV icon in the Folders toolbar.
**Preconditions:** a folder is selected; **Enable TV broadcast** is on; the folder contains at
least one image or video.

1. A dialog **Broadcast folder to TV** explains same-Wi-Fi and a possible Windows Firewall
   prompt. **Help** opens the three-slide wizard.
2. The user confirms **Start broadcast**.
3. A second dialog **TV broadcast is active** shows the URL and, when PIN is on, the PIN.
4. On the TV browser the user opens the URL, types the PIN, and taps **Open album**.
5. The slideshow starts. Arrow keys on the remote step when the show is paused.

**Outcome:** the folder is playing on the TV until the user stops the broadcast.

**Alternate paths**

- **Request 4-digit PIN code on TV** is off → the TV opens the album without a PIN; the desktop
  dialog says PIN is disabled.
- Toolbar icon clicked while already active → **Stop TV broadcast?** instead of start.

**Failure paths**

- No folder selected → "Select a folder first."
- Folder has no images or videos → start fails with that message.
- Port already in use → start fails; the user changes **Broadcast port** in Settings and retries.
- Another broadcast is already active → "Stop it before starting another."
- Wrong PIN on the TV → the page reports an incorrect PIN; playlist stays blocked.

### J-10-01-2 — Stop broadcasting

**Trigger:** TV icon while active, or **Stop broadcast** on the active-info dialog.

1. The user confirms **Stop broadcast**.
2. The HTTP server closes; TV sessions are cleared.

**Outcome:** the TV page stops working immediately.

## 6. Screens & UX

| Screen / view | How the user gets there | Key elements | Component |
|---|---|---|---|
| Toolbar TV control | Folders workspace, folder selected, feature enabled | Start vs stop (pressed) state | `apps/desktop-media/src/renderer/components/DesktopMainToolbar.tsx` |
| Start dialog | TV icon when idle | Copy, Start / Cancel, Help | `apps/desktop-media/src/renderer/components/tv-broadcast/TvBroadcastDialogs.tsx` |
| Active dialog | After a successful start | URL, PIN or “PIN disabled”, Got it / Stop | same |
| Stop dialog | TV icon while active | Destructive confirm | same |
| Help wizard | Help on any of those dialogs | Three slides: what it is, URL/port, PIN and firewall | `apps/desktop-media/src/renderer/components/tv-broadcast/tv-broadcast-help.ts` |
| TV browser page | URL on another device | PIN form, then slideshow | `apps/desktop-media/electron/tv-broadcast-client-html.ts` |
| Settings card | Settings → **Broadcast album to TV** | Enable, PIN, port, Reset to defaults | `apps/desktop-media/src/renderer/components/DesktopSettingsSection.tsx` |

**States**

| State | What the user sees |
|---|---|
| Feature disabled | No TV icon; Settings card still available |
| Idle, folder selected | TV icon, not pressed |
| Active | Icon pressed; URL/PIN dialog until dismissed |
| Empty folder | Start fails; idle status |

**UX notes**

- Settings title says **album**; the action and dialogs say **folder**. Document both; do not
  invent album support.
- The TV client is a self-contained HTML page (Smart TV browsers often fail on bundled ES modules).
- Windows Firewall may prompt on first listen; Help tells the user to allow **Private** networks.

## 7. Business rules

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | At most one broadcast is active. A second start is rejected until stop. | One port, one playlist, one PIN. | `apps/desktop-media/electron/tv-broadcast-server.ts` |
| BR-2 | The playlist is non-recursive: files in the selected folder only. | Matches “this folder on the TV”, not the whole tree. | `apps/desktop-media/electron/fs-media.ts` (`listFolderMedia`) |
| BR-3 | Start fails if the folder has no images or videos. | Avoids an empty TV page. | `apps/desktop-media/electron/tv-broadcast-server.ts` |
| BR-4 | When PIN is required (default), playlist, thumbs, previews and media return 401 until `/api/auth` succeeds. | Casual LAN visitors should not see photos. | `apps/desktop-media/electron/tv-broadcast-server.ts` |
| BR-5 | A successful PIN sets an HttpOnly session cookie (`emk_tv_session`) valid for 12 hours or until stop. | The TV should not re-enter the PIN every slide. | same |
| BR-6 | PIN comparison is timing-safe and padded to four digits. | Avoid leaking the code via response timing. | same |
| BR-7 | Invalid ports (outside 1024–65535) are stored as **8787**. | Prevents binding privileged or nonsense ports. | same (`sanitizeTvBroadcastPort`) |
| BR-8 | The server listens on all interfaces (`0.0.0.0`) at the chosen port. | Other devices on the LAN must reach it. | same |
| BR-9 | Stopping the broadcast (or quitting the app) closes the server and drops sessions. | Media must not keep serving after the user thinks it stopped. | `apps/desktop-media/electron/ipc/tv-broadcast-handlers.ts` |
| BR-10 | The toolbar TV icon is shown only when **Enable TV broadcast** is on **and** a folder is selected. | Avoids a dead control. | `apps/desktop-media/src/renderer/components/DesktopMainToolbar.tsx` |

## 8. Settings & defaults

| Setting (UI label) | Default | Effect | Advanced? |
|---|---|---|---|
| Enable TV broadcast | On | Shows the toolbar TV icon | No |
| Request 4-digit PIN code on TV | On | TV must enter the PIN before media | No |
| Broadcast port | `8787` | TCP port 1024–65535 | No |

Defined in `apps/desktop-media/src/shared/ipc.ts` (`DEFAULT_TV_BROADCAST_SETTINGS`). Surfaced in
Settings → **Broadcast album to TV**. Per-section **Reset to defaults** restores these three only.

## 9. Data & persistence

| Data | Where | User-visible meaning |
|---|---|---|
| Enable, PIN required, port | `media-settings.json` → `tvBroadcast` | Survives restart |
| Active URL, PIN, sessions | Memory in the main process | Lost when broadcast stops or the app quits |
| Thumb / poster / upright-video caches | Temp cache dirs used by the broadcast helpers | Disposable; not the catalog |

The PIN is generated per start (`0000`–`9999`) and is not saved to settings.

## 10. Dependencies & failure modes

| Depends on | Needed for | What the user sees if unavailable |
|---|---|---|
| A selected folder with media | Playlist | Error copy in the start dialog |
| Free TCP port | Bind | Error; change port in Settings |
| Same LAN / Wi-Fi | TV reaching the PC | TV browser cannot load the URL |
| Windows Firewall allow (first time) | Inbound HTTP | Connection fails until the user allows the app |
| Optional ffmpeg (packaged) | Upright video proxies when a video is rotated | Rotated videos may play incorrectly on TVs that ignore CSS transforms |

## 11. Automatable actions & API surface

| Action / channel | Parameters | Intent |
|---|---|---|
| `startFolderBroadcast` | `folderPath`, `port`, `requirePin` (default true) | Start the LAN server |
| `stopBroadcast` | — | Stop and clear sessions |
| `getBroadcastStatus` | — | Read whether a broadcast is active |

Renderer registry: `apps/desktop-media/src/renderer/actions/tv-broadcast-actions.ts`.
IPC: `media:tv-broadcast-start`, `media:tv-broadcast-stop`, `media:tv-broadcast-get-status`,
plus `media:tv-broadcast-status-changed` push events.

## 12. Quality & test coverage

| Type | Test | Covers |
|---|---|---|
| E2E | `apps/desktop-media/tests/e2e/tv-broadcast.spec.ts` | Settings labels; start shows URL and PIN; unauthenticated playlist is 401; auth cookie unlocks playlist; stop; disabling hides the icon |
| Unit | `apps/desktop-media/electron/tv-broadcast-server.test.ts` | Port clamp, PIN shape, PIN-gated playlist |
| Unit | `apps/desktop-media/src/renderer/actions/tv-broadcast-actions.test.ts` | IPC parameters including `requirePin: false` |
| Unit | `apps/desktop-media/src/shared/tv-broadcast-settings.test.ts` | Defaults enabled / 8787 / requirePin |

**Coverage gaps:** no automated run inside a TV browser; video-proxy and firewall prompts are
manual.

## 13. Known limitations & open questions

- **Limitation:** albums cannot be broadcast. Settings and some TV copy still say “album”.
  [J-X3](../JOURNEYS.md) describes album broadcast; the code path is folder-only.
- **Limitation:** subfolders are not included.
- **Limitation:** no friendly hostname — the user types an IPv4 address and port.
- **Limitation:** the `broadcast:tv` help-topic id exists in guided-experience types but TV Help
  does not persist dismissal (unlike Invoices & Receipts).
- **Open question:** whether a later version should broadcast the current album or search set
  without changing folder selection.

## 14. References

- Module: [Sharing & Presentation](README.md)
- [Media viewer & slideshow](../01-library-browsing-and-media-viewer/03-media-viewer-and-slideshow.md)
- Implementation history: `docs/IMPLEMENTATION-LOG/features/2026-07_tv-broadcast-v01.md`
