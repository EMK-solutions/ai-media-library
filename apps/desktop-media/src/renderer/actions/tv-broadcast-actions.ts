import type { DesktopApi, TvBroadcastStartResult, TvBroadcastStatus } from "../../shared/ipc";

export type TvBroadcastDesktopApi = Pick<
  DesktopApi,
  "startTvBroadcast" | "stopTvBroadcast" | "getTvBroadcastStatus"
>;

export async function startFolderBroadcast(
  api: TvBroadcastDesktopApi,
  folderPath: string,
  port: number,
  requirePin = true,
): Promise<TvBroadcastStartResult> {
  return api.startTvBroadcast({ folderPath, port, requirePin });
}

export async function stopBroadcast(api: TvBroadcastDesktopApi): Promise<TvBroadcastStatus> {
  return api.stopTvBroadcast();
}

export async function getBroadcastStatus(api: TvBroadcastDesktopApi): Promise<TvBroadcastStatus> {
  return api.getTvBroadcastStatus();
}
