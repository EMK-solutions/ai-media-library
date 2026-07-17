import { describe, expect, it, vi } from "vitest";
import { getBroadcastStatus, startFolderBroadcast, stopBroadcast } from "./tv-broadcast-actions";

describe("tv-broadcast-actions", () => {
  it("startFolderBroadcast calls IPC with folder and port", async () => {
    const startTvBroadcast = vi.fn().mockResolvedValue({
      ok: true,
      status: {
        active: true,
        folderPath: "C:/photos",
        url: "http://192.168.1.2:8787/",
        pin: "1234",
        port: 8787,
        lanIp: "192.168.1.2",
        requirePin: true,
      },
    });
    const api = {
      startTvBroadcast,
      stopTvBroadcast: vi.fn(),
      getTvBroadcastStatus: vi.fn(),
    };
    await startFolderBroadcast(api, "C:/photos", 8787);
    expect(startTvBroadcast).toHaveBeenCalledWith({
      folderPath: "C:/photos",
      port: 8787,
      requirePin: true,
    });
  });

  it("startFolderBroadcast forwards requirePin=false", async () => {
    const startTvBroadcast = vi.fn().mockResolvedValue({
      ok: true,
      status: {
        active: true,
        folderPath: "C:/photos",
        url: "http://192.168.1.2:8787/",
        pin: null,
        port: 8787,
        lanIp: "192.168.1.2",
        requirePin: false,
      },
    });
    await startFolderBroadcast(
      {
        startTvBroadcast,
        stopTvBroadcast: vi.fn(),
        getTvBroadcastStatus: vi.fn(),
      },
      "C:/photos",
      8787,
      false,
    );
    expect(startTvBroadcast).toHaveBeenCalledWith({
      folderPath: "C:/photos",
      port: 8787,
      requirePin: false,
    });
  });

  it("stopBroadcast calls stop IPC", async () => {
    const stopTvBroadcast = vi.fn().mockResolvedValue({
      active: false,
      folderPath: null,
      url: null,
      pin: null,
      port: null,
      lanIp: null,
      requirePin: null,
    });
    await stopBroadcast({
      startTvBroadcast: vi.fn(),
      stopTvBroadcast,
      getTvBroadcastStatus: vi.fn(),
    });
    expect(stopTvBroadcast).toHaveBeenCalled();
  });

  it("getBroadcastStatus calls status IPC", async () => {
    const getTvBroadcastStatus = vi.fn().mockResolvedValue({
      active: false,
      folderPath: null,
      url: null,
      pin: null,
      port: null,
      lanIp: null,
      requirePin: null,
    });
    await getBroadcastStatus({
      startTvBroadcast: vi.fn(),
      stopTvBroadcast: vi.fn(),
      getTvBroadcastStatus,
    });
    expect(getTvBroadcastStatus).toHaveBeenCalled();
  });
});
