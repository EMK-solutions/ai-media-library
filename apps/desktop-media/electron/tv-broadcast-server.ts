import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  DEFAULT_TV_BROADCAST_PORT,
  IMAGE_EXTENSIONS,
  TV_BROADCAST_PORT_MAX,
  TV_BROADCAST_PORT_MIN,
  VIDEO_EXTENSIONS,
  type MediaKind,
  type TvBroadcastStatus,
} from "../src/shared/ipc";
import { listFolderMedia } from "./fs-media";
import {
  readMp4VideoOrientationSync,
  type QuarterTurnDegrees,
} from "./mp4-video-orientation";
import { buildTvBroadcastClientHtml } from "./tv-broadcast-client-html";
import { getOrCreateImageStageJpeg, getOrCreateImageThumbJpeg } from "./tv-broadcast-thumbs";
import { getOrCreateVideoPosterJpeg } from "./tv-broadcast-video-poster";
import {
  ensureUprightVideoFile,
  prefetchUprightVideoFile,
} from "./tv-broadcast-video-proxy";

const SESSION_COOKIE = "emk_tv_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const TV_CLIENT_HTML = buildTvBroadcastClientHtml();
const VIDEO_THUMB_SVG = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
  <rect width="320" height="180" fill="#1e293b"/>
  <circle cx="160" cy="90" r="36" fill="#334155"/>
  <polygon points="148,70 148,110 186,90" fill="#e2e8f0"/>
</svg>`,
  "utf8",
);

export interface TvBroadcastPlaylistItem {
  id: string;
  name: string;
  mediaKind: MediaKind;
  mediaUrl: string;
  thumbUrl: string;
  /** Downscaled upright JPEG for fast stage swaps (images only). */
  previewUrl?: string;
  /** Clockwise degrees from MP4 display matrix; 0 when unknown/identity. */
  rotationDegrees?: QuarterTurnDegrees;
  codedWidth?: number;
  codedHeight?: number;
}

export interface TvBroadcastPlaylistResponse {
  folderPath: string;
  folderName: string;
  items: TvBroadcastPlaylistItem[];
}

interface PlaylistEntry {
  id: string;
  absolutePath: string;
  name: string;
  mediaKind: MediaKind;
  rotationDegrees: QuarterTurnDegrees;
  codedWidth: number | null;
  codedHeight: number | null;
}

interface ActiveBroadcast {
  server: http.Server;
  folderPath: string;
  port: number;
  pin: string | null;
  requirePin: boolean;
  lanIp: string;
  url: string;
  entries: Map<string, PlaylistEntry>;
  sessions: Map<string, number>;
  staticRoot: string;
}

let active: ActiveBroadcast | null = null;

export function sanitizeTvBroadcastPort(candidate: unknown): number {
  const n = typeof candidate === "number" ? candidate : Number(candidate);
  if (!Number.isFinite(n)) {
    return DEFAULT_TV_BROADCAST_PORT;
  }
  const rounded = Math.round(n);
  if (rounded < TV_BROADCAST_PORT_MIN || rounded > TV_BROADCAST_PORT_MAX) {
    return DEFAULT_TV_BROADCAST_PORT;
  }
  return rounded;
}

export function generateTvBroadcastPin(): string {
  return String(randomInt(0, 10_000)).padStart(4, "0");
}

export function resolveLanIpv4(): string {
  const nets = os.networkInterfaces();
  for (const entries of Object.values(nets)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.family === "IPv4" && !entry.internal) {
        return entry.address;
      }
    }
  }
  return "127.0.0.1";
}

export function buildTvBroadcastUrl(lanIp: string, port: number): string {
  return `http://${lanIp}:${port}/`;
}

export function getInactiveTvBroadcastStatus(): TvBroadcastStatus {
  return {
    active: false,
    folderPath: null,
    url: null,
    pin: null,
    port: null,
    lanIp: null,
    requirePin: null,
  };
}

export function getTvBroadcastStatus(): TvBroadcastStatus {
  if (!active) {
    return getInactiveTvBroadcastStatus();
  }
  return {
    active: true,
    folderPath: active.folderPath,
    url: active.url,
    pin: active.requirePin ? active.pin : null,
    port: active.port,
    lanIp: active.lanIp,
    requirePin: active.requirePin,
  };
}

function pinsEqual(a: string, b: string): boolean {
  const left = Buffer.from(a.padStart(4, "0"));
  const right = Buffer.from(b.padStart(4, "0"));
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(value);
  }
  return out;
}

function isAuthenticated(req: http.IncomingMessage, broadcast: ActiveBroadcast): boolean {
  if (!broadcast.requirePin) {
    return true;
  }
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE];
  if (!token) return false;
  const expiresAt = broadcast.sessions.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    broadcast.sessions.delete(token);
    return false;
  }
  return true;
}

function sendHtml(res: http.ServerResponse, html: string): void {
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(html),
    "Cache-Control": "no-store",
  });
  res.end(html);
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

function contentTypeForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  if (ext === ".bmp") return "image/bmp";
  if (ext === ".tif" || ext === ".tiff") return "image/tiff";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".webm") return "video/webm";
  if (ext === ".mov" || ext === ".m4v") return "video/quicktime";
  if (ext === ".mkv") return "video/x-matroska";
  if (ext === ".avi") return "video/x-msvideo";
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".map") return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function isPathInsideFolder(filePath: string, folderPath: string): boolean {
  const relative = path.relative(folderPath, filePath);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function resolveStaticFile(staticRoot: string, urlPath: string): string | null {
  const decoded = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const relative = decoded === "/" ? "tv.html" : decoded.replace(/^\//, "");
  const absolute = path.resolve(staticRoot, relative);
  if (!isPathInsideFolder(absolute, staticRoot)) {
    return null;
  }
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    return null;
  }
  return absolute;
}

async function readRequestBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function serveFileWithRange(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  filePath: string,
): void {
  const stat = fs.statSync(filePath);
  const total = stat.size;
  const type = contentTypeForPath(filePath);
  const range = req.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Number(match[2]) : total - 1;
      if (Number.isFinite(start) && Number.isFinite(end) && start <= end && end < total) {
        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${total}`,
          "Accept-Ranges": "bytes",
          "Content-Length": end - start + 1,
          "Content-Type": type,
          "Cache-Control": "private, max-age=3600",
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
        return;
      }
    }
  }
  res.writeHead(200, {
    "Content-Length": total,
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  });
  fs.createReadStream(filePath).pipe(res);
}

function createRequestHandler(broadcast: ActiveBroadcast): http.RequestListener {
  return (req, res) => {
    void (async () => {
      try {
        const method = req.method ?? "GET";
        const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

        if (method === "OPTIONS") {
          res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Credentials": "true",
          });
          res.end();
          return;
        }

        if (method === "POST" && url.pathname === "/api/auth") {
          if (!broadcast.requirePin || !broadcast.pin) {
            sendJson(res, 200, { ok: true, requirePin: false });
            return;
          }
          const raw = await readRequestBody(req);
          let pin = "";
          try {
            const parsed = JSON.parse(raw) as { pin?: unknown };
            pin = typeof parsed.pin === "string" ? parsed.pin.trim() : "";
          } catch {
            sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
            return;
          }
          if (!pinsEqual(pin, broadcast.pin)) {
            sendJson(res, 401, { ok: false, error: "Incorrect PIN." });
            return;
          }
          const token = randomBytes(24).toString("hex");
          broadcast.sessions.set(token, Date.now() + SESSION_TTL_MS);
          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Set-Cookie": `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`,
            "Cache-Control": "no-store",
          });
          res.end(JSON.stringify({ ok: true, requirePin: true }));
          return;
        }

        if (method === "GET" && url.pathname === "/api/status") {
          sendJson(res, 200, {
            active: true,
            authenticated: isAuthenticated(req, broadcast),
            requirePin: broadcast.requirePin,
            folderName: path.basename(broadcast.folderPath),
          });
          return;
        }

        if (method === "GET" && url.pathname === "/api/playlist") {
          if (!isAuthenticated(req, broadcast)) {
            sendJson(res, 401, { ok: false, error: "PIN required." });
            return;
          }
          const items: TvBroadcastPlaylistItem[] = [];
          for (const entry of broadcast.entries.values()) {
            const item: TvBroadcastPlaylistItem = {
              id: entry.id,
              name: entry.name,
              mediaKind: entry.mediaKind,
              mediaUrl: `/media/${entry.id}`,
              thumbUrl: `/thumb/${entry.id}?v=8`,
            };
            if (entry.mediaKind === "image") {
              item.previewUrl = `/preview/${entry.id}?v=8`;
            }
            if (entry.mediaKind === "video" && entry.codedWidth && entry.codedHeight) {
              item.codedWidth = entry.codedWidth;
              item.codedHeight = entry.codedHeight;
            }
            items.push(item);
          }
          const body: TvBroadcastPlaylistResponse = {
            folderPath: broadcast.folderPath,
            folderName: path.basename(broadcast.folderPath),
            items,
          };
          sendJson(res, 200, body);
          return;
        }

        if (method === "GET" && url.pathname.startsWith("/thumb/")) {
          if (!isAuthenticated(req, broadcast)) {
            sendJson(res, 401, { ok: false, error: "PIN required." });
            return;
          }
          const id = decodeURIComponent(url.pathname.slice("/thumb/".length));
          const entry = broadcast.entries.get(id);
          if (!entry) {
            sendJson(res, 404, { ok: false, error: "Not found." });
            return;
          }
          if (entry.mediaKind === "video") {
            try {
              const poster = await getOrCreateVideoPosterJpeg(entry.absolutePath);
              if (poster) {
                res.writeHead(200, {
                  "Content-Type": "image/jpeg",
                  "Content-Length": poster.length,
                  "Cache-Control": "public, max-age=3600",
                });
                res.end(poster);
                return;
              }
            } catch {
              // fall through to SVG placeholder
            }
            res.writeHead(200, {
              "Content-Type": "image/svg+xml; charset=utf-8",
              "Content-Length": VIDEO_THUMB_SVG.length,
              "Cache-Control": "public, max-age=3600",
            });
            res.end(VIDEO_THUMB_SVG);
            return;
          }
          try {
            const thumb = await getOrCreateImageThumbJpeg(entry.absolutePath);
            if (!thumb) {
              serveFileWithRange(req, res, entry.absolutePath);
              return;
            }
            res.writeHead(200, {
              "Content-Type": "image/jpeg",
              "Content-Length": thumb.length,
              "Cache-Control": "public, max-age=3600",
            });
            res.end(thumb);
          } catch {
            serveFileWithRange(req, res, entry.absolutePath);
          }
          return;
        }

        if (method === "GET" && url.pathname.startsWith("/preview/")) {
          if (!isAuthenticated(req, broadcast)) {
            sendJson(res, 401, { ok: false, error: "PIN required." });
            return;
          }
          const id = decodeURIComponent(url.pathname.slice("/preview/".length));
          const entry = broadcast.entries.get(id);
          if (!entry || entry.mediaKind !== "image") {
            sendJson(res, 404, { ok: false, error: "Not found." });
            return;
          }
          try {
            const preview = await getOrCreateImageStageJpeg(entry.absolutePath);
            if (!preview) {
              serveFileWithRange(req, res, entry.absolutePath);
              return;
            }
            res.writeHead(200, {
              "Content-Type": "image/jpeg",
              "Content-Length": preview.length,
              "Cache-Control": "public, max-age=3600",
            });
            res.end(preview);
          } catch {
            serveFileWithRange(req, res, entry.absolutePath);
          }
          return;
        }

        if (method === "GET" && url.pathname.startsWith("/media/")) {
          if (!isAuthenticated(req, broadcast)) {
            sendJson(res, 401, { ok: false, error: "PIN required." });
            return;
          }
          const id = url.pathname.slice("/media/".length);
          const entry = broadcast.entries.get(id);
          if (!entry) {
            sendJson(res, 404, { ok: false, error: "Media not found." });
            return;
          }
          const resolved = path.resolve(entry.absolutePath);
          const folderResolved = path.resolve(broadcast.folderPath);
          if (!isPathInsideFolder(resolved, folderResolved)) {
            sendJson(res, 403, { ok: false, error: "Forbidden." });
            return;
          }
          if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
            sendJson(res, 404, { ok: false, error: "File missing." });
            return;
          }
          let servePath = resolved;
          if (entry.mediaKind === "video" && entry.rotationDegrees !== 0) {
            // Await upright proxy so Smart TVs get correctly oriented pixels
            // (many TV engines ignore CSS transforms on hardware video overlays).
            servePath = await ensureUprightVideoFile(resolved, entry.rotationDegrees);
          }
          serveFileWithRange(req, res, servePath);
          return;
        }

        if (method === "GET") {
          // Always serve the self-contained TV client for the app shell.
          // This avoids white pages when Vite TV assets are missing (dev) and
          // works on Smart TV browsers that do not handle ES modules well.
          if (
            url.pathname === "/" ||
            url.pathname === "/tv.html" ||
            url.pathname === "/index.html"
          ) {
            sendHtml(res, TV_CLIENT_HTML);
            return;
          }
          const filePath = resolveStaticFile(broadcast.staticRoot, url.pathname);
          if (!filePath) {
            sendHtml(res, TV_CLIENT_HTML);
            return;
          }
          serveFileWithRange(req, res, filePath);
          return;
        }

        sendJson(res, 405, { ok: false, error: "Method not allowed." });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Server error.";
        sendJson(res, 500, { ok: false, error: message });
      }
    })();
  };
}

export function resolveTvClientStaticRoot(): string {
  // Compiled main lives in dist-electron/; renderer assets are sibling dist-renderer/.
  // In source/dev runs from electron/, ../dist-renderer is still correct.
  return path.resolve(__dirname, "../dist-renderer");
}

export async function startTvBroadcast(options: {
  folderPath: string;
  port: number;
  staticRoot: string;
  requirePin?: boolean;
}): Promise<{ ok: true; status: TvBroadcastStatus } | { ok: false; error: string; status: TvBroadcastStatus }> {
  const port = sanitizeTvBroadcastPort(options.port);
  const requirePin = options.requirePin !== false;
  if (active) {
    return {
      ok: false,
      error: "A TV broadcast is already active. Stop it before starting another.",
      status: getTvBroadcastStatus(),
    };
  }

  const folderPath = path.resolve(options.folderPath);
  let media;
  try {
    media = await listFolderMedia(folderPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list folder media.";
    return { ok: false, error: message, status: getInactiveTvBroadcastStatus() };
  }

  if (media.length === 0) {
    return {
      ok: false,
      error: "Selected folder has no images or videos to broadcast.",
      status: getInactiveTvBroadcastStatus(),
    };
  }

  const entries = new Map<string, PlaylistEntry>();
  for (const item of media) {
    const id = Buffer.from(item.path).toString("base64url");
    const ext = path.extname(item.name).toLowerCase();
    const mediaKind: MediaKind =
      item.mediaKind ??
      (VIDEO_EXTENSIONS.has(ext) ? "video" : IMAGE_EXTENSIONS.has(ext) ? "image" : "image");
    let rotationDegrees: QuarterTurnDegrees = 0;
    let codedWidth: number | null = null;
    let codedHeight: number | null = null;
    if (mediaKind === "video") {
      const orientation = readMp4VideoOrientationSync(item.path);
      if (orientation) {
        rotationDegrees = orientation.rotationDegrees;
        codedWidth = orientation.codedWidth;
        codedHeight = orientation.codedHeight;
      }
    }
    entries.set(id, {
      id,
      absolutePath: item.path,
      name: item.name,
      mediaKind,
      rotationDegrees,
      codedWidth,
      codedHeight,
    });
    if (mediaKind === "video" && rotationDegrees !== 0) {
      prefetchUprightVideoFile(item.path, rotationDegrees);
      void getOrCreateVideoPosterJpeg(item.path);
    } else if (mediaKind === "video") {
      void getOrCreateVideoPosterJpeg(item.path);
    } else if (mediaKind === "image") {
      // Prefetch rail thumbs only — stage (1920) bake on demand so cold thumbs
      // are not stuck behind a folder-wide full-res stampede.
      void getOrCreateImageThumbJpeg(item.path);
    }
  }

  const pin = requirePin ? generateTvBroadcastPin() : null;
  const lanIp = resolveLanIpv4();
  const url = buildTvBroadcastUrl(lanIp, port);

  // Ensure static root exists for optional built assets; app shell is inline HTML.
  await fsPromises.mkdir(options.staticRoot, { recursive: true });
  await ensureMinimalTvClient(options.staticRoot);

  const server = http.createServer();
  const broadcast: ActiveBroadcast = {
    server,
    folderPath,
    port,
    pin,
    requirePin,
    lanIp,
    url,
    entries,
    sessions: new Map(),
    staticRoot: options.staticRoot,
  };
  server.on("request", createRequestHandler(broadcast));

  try {
    await new Promise<void>((resolve, reject) => {
      const onError = (error: NodeJS.ErrnoException) => {
        server.off("listening", onListening);
        reject(error);
      };
      const onListening = () => {
        server.off("error", onError);
        resolve();
      };
      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(port, "0.0.0.0");
    });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "EADDRINUSE") {
      return {
        ok: false,
        error: `Port ${port} is already in use. Change the TV broadcast port in Settings and try again.`,
        status: getInactiveTvBroadcastStatus(),
      };
    }
    const message = err.message || "Failed to start TV broadcast server.";
    return { ok: false, error: message, status: getInactiveTvBroadcastStatus() };
  }

  const address = server.address() as AddressInfo | null;
  if (address && address.port !== port) {
    await stopTvBroadcast();
    return {
      ok: false,
      error: `Server bound unexpected port. Configure port ${port} in Settings.`,
      status: getInactiveTvBroadcastStatus(),
    };
  }

  active = broadcast;
  return { ok: true, status: getTvBroadcastStatus() };
}

export async function stopTvBroadcast(): Promise<TvBroadcastStatus> {
  if (!active) {
    return getInactiveTvBroadcastStatus();
  }
  const server = active.server;
  active = null;
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
    // Force-close lingering connections
    server.closeAllConnections?.();
  });
  return getInactiveTvBroadcastStatus();
}

async function ensureMinimalTvClient(staticRoot: string): Promise<void> {
  await fsPromises.mkdir(staticRoot, { recursive: true });
  const tvHtmlPath = path.join(staticRoot, "tv.html");
  // Always refresh the on-disk copy so packaged/dev inspection matches the inline client.
  await fsPromises.writeFile(tvHtmlPath, TV_CLIENT_HTML, "utf8");
}

/** Test helper: expose pathToFileURL for diagnostics. */
export function toFileUrlForTests(absolutePath: string): string {
  return pathToFileURL(absolutePath).toString();
}
