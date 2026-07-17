import { describe, expect, it } from "vitest";
import { buildTvBroadcastClientHtml } from "./tv-broadcast-client-html";

describe("buildTvBroadcastClientHtml", () => {
  it("includes PIN gate, icon controls, and avoids Vite module entry", () => {
    const html = buildTvBroadcastClientHtml();
    expect(html).toContain('aria-label="Broadcast PIN"');
    expect(html).toContain("Open album");
    expect(html).toContain('aria-label="Play slideshow"');
    expect(html).toContain('aria-label="Enter fullscreen"');
    expect(html).toContain("fullscreenBtn");
    expect(html).toContain("toggleFullscreen");
    expect(html).toContain("fit-contain");
    expect(html).toContain("fit-cover");
    expect(html).toContain("applyImageFit");
    expect(html).toContain("COVER_AR_THRESHOLD");
    expect(html).toContain("video-shell");
    expect(html).toContain("image-orientation: from-image");
    expect(html).toContain("clearAdvanceTimer");
    expect(html).toContain('loading = "lazy"');
    expect(html).toContain("thumb-play");
    expect(html).toContain("0.8s ease-in-out");
    expect(html).toContain("z-index: 30");
    expect(html).toContain("showImageSmooth");
    expect(html).toContain("preloadAround");
    expect(html).toContain("previewUrl");
    expect(html).not.toContain("video-rotator");
    expect(html).not.toContain("resolveManualRotation");
    expect(html).not.toContain("type=\"module\"");
    expect(html).not.toContain("/src/tv-client/");
  });
});
