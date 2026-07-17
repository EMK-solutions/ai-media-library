import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildTvBroadcastUrl,
  generateTvBroadcastPin,
  sanitizeTvBroadcastPort,
  startTvBroadcast,
  stopTvBroadcast,
  getTvBroadcastStatus,
} from "./tv-broadcast-server";

describe("tv-broadcast-server helpers", () => {
  it("sanitizeTvBroadcastPort clamps invalid values to default", () => {
    expect(sanitizeTvBroadcastPort(8787)).toBe(8787);
    expect(sanitizeTvBroadcastPort(80)).toBe(8787);
    expect(sanitizeTvBroadcastPort(70000)).toBe(8787);
    expect(sanitizeTvBroadcastPort("bad")).toBe(8787);
  });

  it("generateTvBroadcastPin returns 4 digits", () => {
    const pin = generateTvBroadcastPin();
    expect(pin).toMatch(/^\d{4}$/);
  });

  it("buildTvBroadcastUrl formats LAN URL", () => {
    expect(buildTvBroadcastUrl("192.168.1.10", 8787)).toBe("http://192.168.1.10:8787/");
  });
});

describe("tv-broadcast-server integration", () => {
  let tempDir = "";
  let staticRoot = "";

  beforeEach(async () => {
    await stopTvBroadcast();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tv-broadcast-"));
    staticRoot = path.join(tempDir, "static");
    await fs.mkdir(staticRoot, { recursive: true });
    await fs.writeFile(path.join(tempDir, "a.jpg"), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  });

  afterEach(async () => {
    await stopTvBroadcast();
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("starts server, requires PIN, then serves playlist and media", async () => {
    const started = await startTvBroadcast({
      folderPath: tempDir,
      port: 18787,
      staticRoot,
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const status = getTvBroadcastStatus();
    expect(status.active).toBe(true);
    expect(status.pin).toMatch(/^\d{4}$/);
    expect(status.port).toBe(18787);

    const unauthorized = await fetch(`http://127.0.0.1:18787/api/playlist`);
    expect(unauthorized.status).toBe(401);

    const home = await fetch(`http://127.0.0.1:18787/`);
    expect(home.status).toBe(200);
    const html = await home.text();
    expect(html).toContain("Broadcast PIN");
    expect(html).toContain("Open album");
    expect(html).not.toContain("/src/tv-client/main.tsx");

    const badAuth = await fetch(`http://127.0.0.1:18787/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: "0000" === status.pin ? "1111" : "0000" }),
    });
    expect(badAuth.status).toBe(401);

    const auth = await fetch(`http://127.0.0.1:18787/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: status.pin }),
    });
    expect(auth.status).toBe(200);
    const setCookie = auth.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("emk_tv_session=");

    const playlist = await fetch(`http://127.0.0.1:18787/api/playlist`, {
      headers: { Cookie: setCookie.split(";")[0] ?? "" },
    });
    expect(playlist.status).toBe(200);
    const body = (await playlist.json()) as {
      items: Array<{ id: string; thumbUrl: string; mediaUrl: string; previewUrl?: string }>;
    };
    expect(body.items.length).toBe(1);
    expect(body.items[0]?.thumbUrl).toBe(`/thumb/${body.items[0]?.id}?v=8`);
    expect(body.items[0]?.previewUrl).toBe(`/preview/${body.items[0]?.id}?v=8`);

    const thumb = await fetch(`http://127.0.0.1:18787/thumb/${body.items[0].id}?v=8`, {
      headers: { Cookie: setCookie.split(";")[0] ?? "" },
    });
    expect(thumb.status).toBe(200);
    expect(thumb.headers.get("content-type")).toMatch(/image\//);

    const preview = await fetch(`http://127.0.0.1:18787/preview/${body.items[0].id}?v=8`, {
      headers: { Cookie: setCookie.split(";")[0] ?? "" },
    });
    expect(preview.status).toBe(200);
    expect(preview.headers.get("content-type")).toMatch(/image\//);

    const media = await fetch(`http://127.0.0.1:18787/media/${body.items[0].id}`, {
      headers: { Cookie: setCookie.split(";")[0] ?? "" },
    });
    expect(media.status).toBe(200);

    const stopped = await stopTvBroadcast();
    expect(stopped.active).toBe(false);
  }, 20_000);

  it("allows playlist without PIN when requirePin is false", async () => {
    const started = await startTvBroadcast({
      folderPath: tempDir,
      port: 18789,
      staticRoot,
      requirePin: false,
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.status.requirePin).toBe(false);
    expect(started.status.pin).toBeNull();

    const playlist = await fetch(`http://127.0.0.1:18789/api/playlist`);
    expect(playlist.status).toBe(200);
    const body = (await playlist.json()) as { items: unknown[] };
    expect(body.items.length).toBe(1);

    await stopTvBroadcast();
  }, 15_000);

  it("fails clearly when a broadcast is already active", async () => {
    const first = await startTvBroadcast({
      folderPath: tempDir,
      port: 18788,
      staticRoot,
    });
    expect(first.ok).toBe(true);

    const second = await startTvBroadcast({
      folderPath: tempDir,
      port: 18788,
      staticRoot,
    });
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error).toMatch(/already active/i);
    }
  }, 15_000);
});
