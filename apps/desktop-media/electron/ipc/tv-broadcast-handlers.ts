import { BrowserWindow, ipcMain } from "electron";
import {
  IPC_CHANNELS,
  type TvBroadcastStartRequest,
  type TvBroadcastStatus,
} from "../../src/shared/ipc";
import {
  getTvBroadcastStatus,
  resolveTvClientStaticRoot,
  startTvBroadcast,
  stopTvBroadcast,
} from "../tv-broadcast-server";

function broadcastStatus(status: TvBroadcastStatus): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      try {
        win.webContents.send(IPC_CHANNELS.tvBroadcastStatusChanged, status);
      } catch {
        // Frame may be disposed; ignore.
      }
    }
  }
}

export function registerTvBroadcastHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.tvBroadcastStart, async (_event, request: TvBroadcastStartRequest) => {
    const folderPath = typeof request?.folderPath === "string" ? request.folderPath.trim() : "";
    if (!folderPath) {
      return {
        ok: false,
        error: "Folder path is required.",
        status: getTvBroadcastStatus(),
      };
    }
    const port = typeof request?.port === "number" ? request.port : Number(request?.port);
    const requirePin = request?.requirePin !== false;
    const staticRoot = resolveTvClientStaticRoot();
    const result = await startTvBroadcast({
      folderPath,
      port,
      staticRoot,
      requirePin,
    });
    broadcastStatus(result.status);
    return result;
  });

  ipcMain.handle(IPC_CHANNELS.tvBroadcastStop, async () => {
    const status = await stopTvBroadcast();
    broadcastStatus(status);
    return status;
  });

  ipcMain.handle(IPC_CHANNELS.tvBroadcastGetStatus, async () => getTvBroadcastStatus());
}

export async function stopTvBroadcastOnQuit(): Promise<void> {
  await stopTvBroadcast();
}
