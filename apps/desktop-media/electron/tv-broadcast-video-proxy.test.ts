import { describe, expect, it } from "vitest";
import { resolveFfmpegPath, proxyOutputPathForSource } from "./tv-broadcast-video-proxy";

describe("tv-broadcast-video-proxy", () => {
  it("resolves ffmpeg without throwing", () => {
    const resolved = resolveFfmpegPath();
    expect(resolved === null || typeof resolved === "string").toBe(true);
  });

  it("uses versioned upright cache paths (avoids stale double-rotated proxies)", () => {
    const out = proxyOutputPathForSource("C:\\photos\\clip.mp4");
    expect(out).toContain("_upright_v3.mp4");
  });
});
