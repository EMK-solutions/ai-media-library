import { describe, expect, it } from "vitest";
import { createSettingsEchoGuard } from "./settings-echo-guard";

describe("createSettingsEchoGuard", () => {
  it("applies broadcasts when no local save is pending", () => {
    const guard = createSettingsEchoGuard();
    expect(guard.shouldApplyBroadcast()).toBe(true);
  });

  it("skips the echo of an older save while a newer save is in flight", () => {
    const guard = createSettingsEchoGuard();
    guard.beginLocalSave();
    guard.beginLocalSave();
    expect(guard.shouldApplyBroadcast()).toBe(false);
    expect(guard.shouldApplyBroadcast()).toBe(true);
    expect(guard.shouldApplyBroadcast()).toBe(true);
  });

  it("does not wait for an echo from a save that failed", () => {
    const guard = createSettingsEchoGuard();
    const failFirst = guard.beginLocalSave();
    guard.beginLocalSave();
    failFirst();
    failFirst();
    expect(guard.shouldApplyBroadcast()).toBe(true);
  });
});
