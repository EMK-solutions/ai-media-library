# TV Broadcast v01

**Date:** 2026-07-17  
**Branch:** `feature/TV-broadcast-v01`

## Goal

Allow broadcasting the selected folder to a Smart TV browser via a local HTTP server with PIN protection, reusing `MediaSwiperViewer` in TV mode.

## What shipped

- Settings: `tvBroadcast.enabled` (default true) + configurable `tvBroadcast.port` (default 8787).
- Toolbar TV icon gated by settings; start/stop confirm dialogs; Help wizard (`broadcast:tv`).
- Main-process HTTP server: PIN auth, playlist API, ranged media streaming, path allowlist.
- TV client: self-contained HTML/JS served inline by the HTTP server (PIN gate + slideshow). Avoids white pages when Vite assets are missing and works on Smart TV browsers that struggle with ES modules. React `MediaSwiperViewer` TV entry remains available for future enhancement.
- Unit/integration tests for helpers, server, actions, help deck; Playwright E2E for settings/start/stop/PIN HTTP path.
- `MediaSwiperViewer` props: `allowTouchMove`, `autoStartSlideshow`, `autoEnterFullscreen`, `showCloseButton`, `showFullscreenButton`, `thumbSize="tv"`.

## Notes

- Busy port fails with a clear Settings message (no silent remap).
- Windows Firewall may prompt on first broadcast — covered in Help slides.
