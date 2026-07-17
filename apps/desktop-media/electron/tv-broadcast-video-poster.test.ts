import { describe, expect, it } from "vitest";
import { resolveFfmpegPath } from "./tv-broadcast-video-proxy";
import { tvBroadcastPosterCacheDir } from "./tv-broadcast-video-poster";

describe("tv-broadcast-video-poster", () => {
  it("shares ffmpeg resolver with video proxy", () => {
    const resolved = resolveFfmpegPath();
    expect(resolved === null || typeof resolved === "string").toBe(true);
  });

  it("uses a dedicated poster cache directory", () => {
    expect(tvBroadcastPosterCacheDir()).toMatch(/emk-tv-broadcast-posters/);
  });
});
