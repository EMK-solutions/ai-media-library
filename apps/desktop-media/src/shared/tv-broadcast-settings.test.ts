import { describe, expect, it } from "vitest";
import { DEFAULT_TV_BROADCAST_SETTINGS } from "./ipc";

describe("tvBroadcast settings defaults", () => {
  it("is enabled by default on port 8787 with PIN required", () => {
    expect(DEFAULT_TV_BROADCAST_SETTINGS.enabled).toBe(true);
    expect(DEFAULT_TV_BROADCAST_SETTINGS.port).toBe(8787);
    expect(DEFAULT_TV_BROADCAST_SETTINGS.requirePin).toBe(true);
  });
});
