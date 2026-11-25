/**
 * Main broadcasts every saved settings payload back to renderers. When the renderer saves twice in
 * quick succession, the echo of the first save arrives after the store already holds the second
 * change; applying it would revert that change and trigger another save. This guard skips echoes
 * of older local saves while a newer local save is still in flight.
 */
export interface SettingsEchoGuard {
  /** Call right before sending a local save; returns a callback for a failed save (no echo will come). */
  beginLocalSave: () => () => void;
  /** Call for each settings broadcast; returns false when the payload is a stale local echo. */
  shouldApplyBroadcast: () => boolean;
}

export function createSettingsEchoGuard(): SettingsEchoGuard {
  let pendingLocalSaves = 0;
  return {
    beginLocalSave: () => {
      pendingLocalSaves += 1;
      let settled = false;
      return () => {
        if (settled) return;
        settled = true;
        pendingLocalSaves = Math.max(0, pendingLocalSaves - 1);
      };
    },
    shouldApplyBroadcast: () => {
      if (pendingLocalSaves === 0) return true;
      pendingLocalSaves -= 1;
      return pendingLocalSaves === 0;
    },
  };
}
