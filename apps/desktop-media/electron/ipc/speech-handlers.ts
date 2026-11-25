import { app, ipcMain } from "electron";
import { IPC_CHANNELS } from "../../src/shared/ipc";
import { resolveModelsPath } from "../app-paths";
import { speechModelFilesIn, speechModelFilesReady } from "../speech/speech-model-paths";

export function registerSpeechHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.getSpeechModelCacheStatus, async () => {
    const files = speechModelFilesIn(resolveModelsPath(app));
    return { hasLocalCopy: speechModelFilesReady(files) };
  });
}
