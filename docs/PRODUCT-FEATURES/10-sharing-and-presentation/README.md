---
id: M-10
title: Sharing & Presentation
status: shipped
last_reviewed: 2026-08-26
---

# Module 10 — Sharing & Presentation

> Show a folder of photos and videos on a television in the same room, without uploading
> anything or installing an app on the TV.

## 1. Purpose & value

This module is how the library leaves the computer. The user starts a **TV broadcast** from the
folder they are looking at; the app hosts a private page on the home network; anyone who opens
that page in the TV's browser (and enters the PIN) sees the same slideshow the desktop viewer
would play. Nothing is published to the internet, and the original files stay where they are.

It is a presentation path, not a sharing or export path. There is no email, no cloud album, no
Chromecast or DLNA protocol — only a local web page, for the duration of the broadcast.

## 2. User stories

- **As a family organiser** I want to put tonight's photos on the living-room TV,
  **so that** everyone can watch without crowding around a laptop.
- **As a privacy-conscious user** I want the TV page gated by a PIN I can see on my computer,
  **so that** a neighbour on the same Wi-Fi cannot open the album by guessing the address.
- **As someone setting up once** I want a Help wizard that explains the URL, PIN and firewall
  prompt, **so that** I do not have to guess how Smart TV browsers work.

## 3. Feature index

| ID | Feature | Status | Primary screen | Doc |
|---|---|---|---|---|
| F-10-01 | TV broadcast | shipped | Folders toolbar TV icon; Settings → **Broadcast album to TV** | [01-tv-broadcast.md](01-tv-broadcast.md) |

## 4. Key journeys

| ID | Journey | Path through the product |
|---|---|---|
| J-10-1 | Show a folder on the TV | Select folder → TV icon → Start broadcast → open the URL on the TV → enter PIN → slideshow |
| J-10-2 | Stop the broadcast | TV icon again (or Stop in the active dialog) → confirm → TV page stops immediately |

The cross-module flow that curates an album *then* presents it is
[J-X3](../JOURNEYS.md#j-x3--curate-an-album-and-show-it-on-a-tv). Today the broadcast step still
takes a **folder**, not an album — see F-10-01 known limitations.

## 5. Entry points & navigation

| Entry point | Leads to | Notes |
|---|---|---|
| Folders toolbar **TV** icon | Start or stop dialog | Visible only when TV broadcast is enabled and a folder is selected |
| Settings → **Broadcast album to TV** | Enable, PIN, port | Section is always shown; the toolbar icon hides when Enable is off |
| Help on the start/stop dialogs | Guided slides | Same deck as the in-app **Broadcast to TV** wizard |

## 6. Key concepts

| Term | Meaning in this module |
|---|---|
| TV broadcast | Serving the selected folder as a local web page while the session is active |
| Broadcast URL | `http://<LAN IPv4>:<port>/`, shown after start |
| PIN | Four-digit code the TV must enter before media loads (on by default) |
| LAN | The same local network; the page is not reachable from the internet by design |

Full definitions: [`../GLOSSARY.md`](../GLOSSARY.md).

## 7. Dependencies

**Depends on**

| Module | What it needs |
|---|---|
| [M-01 Library Browsing & Media Viewer](../01-library-browsing-and-media-viewer/README.md) | A selected folder and the same slideshow viewer behaviour (play, skip videos) |
| [M-11 Settings & Configuration](../11-settings-and-configuration/README.md) | Enable, PIN and port |
| [M-12 Onboarding & Help](../12-onboarding-and-help/README.md) | The **Broadcast to TV** guided deck |

**Depended on by**

| Module | What it consumes |
|---|---|
| [M-06 Albums](../06-albums/README.md) | J-X3 intends to broadcast an album; that step is not implemented yet |

## 8. Settings owned

| Settings group (UI label) | Features affected |
|---|---|
| **Broadcast album to TV** — Enable TV broadcast, Request 4-digit PIN, Broadcast port | F-10-01 |

## 9. Quality snapshot

| Type | Coverage |
|---|---|
| E2E | `apps/desktop-media/tests/e2e/tv-broadcast.spec.ts` — settings fields, start/stop from the toolbar, PIN gate on `/api/playlist`, hiding the icon when disabled |
| Unit | `apps/desktop-media/electron/tv-broadcast-server.test.ts` — port sanitise, PIN format, start/auth/playlist |
| Unit | `apps/desktop-media/src/renderer/actions/tv-broadcast-actions.test.ts` — start/stop/status actions |
| Unit | `apps/desktop-media/src/shared/tv-broadcast-settings.test.ts` — shipped defaults |

**Gaps:** no E2E on a real Smart TV browser; album broadcast is untested because it does not exist.

## 10. Known gaps & direction

- Albums cannot be broadcast yet, despite the Settings section title **Broadcast album to TV**
  and [J-X3](../JOURNEYS.md) describing that path.
- No mDNS / friendly hostname; the user types an IP and port on the TV.
- No Chromecast, AirPlay or DLNA.
- Subfolders are not included — only files sitting directly in the selected folder.
