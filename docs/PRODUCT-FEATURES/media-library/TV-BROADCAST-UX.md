# Broadcast album to TV

## Summary

Broadcast a selected folder to a Smart TV web browser over the local network. The desktop app hosts a private HTTP page that reuses the shared Photo Viewer (`MediaSwiperViewer`) with TV-oriented options (no swipe, no info panel, slideshow on by default).

## Settings

**Settings → Broadcast album to TV**

| Setting | Default | Notes |
|---|---|---|
| Enable TV broadcast | On | When off, the toolbar TV icon is hidden |
| Request 4-digit PIN code on TV | On | TV/phone must enter the PIN from the desktop dialog before media loads. Turn off on a trusted network for quicker testing. |
| Broadcast port | `8787` | TCP port 1024–65535. If the port is busy, change it here and retry |

## Desktop flow

1. Select a folder in the Folders sidebar.
2. Click the **TV** icon in the main toolbar (next to grid/list).
3. Confirm **Start broadcast**. The dialog explains the feature and offers **Help** (guided wizard).
4. After start, a second dialog shows the LAN URL and a **4-digit PIN**.
5. Click the TV icon again while active to confirm **Stop broadcast**.

Only one folder can be broadcast at a time in v1.

## TV flow

1. Open the Smart TV web browser.
2. Enter the URL shown on the desktop (example: `http://192.168.1.20:8787/`).
3. Enter the PIN.
4. The Photo Viewer opens in slideshow mode. Use the remote D-Pad (arrow keys) to navigate when paused.

## Security

- Bound to the LAN while broadcast is active.
- PIN gate before playlist/media access.
- Stopping broadcast closes the server and clears sessions.

## Limitations (v1)

- Folders only (albums later).
- No mDNS / friendly hostname (IP + port).
- No Chromecast / DLNA protocols.
