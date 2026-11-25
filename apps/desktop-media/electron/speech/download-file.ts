import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";

export async function downloadFile(options: {
  url: string;
  destination: string;
  signal?: AbortSignal;
  onProgress?: (received: number, total: number | null) => void;
}): Promise<void> {
  await fs.promises.mkdir(path.dirname(options.destination), { recursive: true });
  const partial = `${options.destination}.partial`;
  await downloadToPartial(options.url, partial, options.signal, options.onProgress, 0);
  await fs.promises.rename(partial, options.destination);
}

function downloadToPartial(
  url: string,
  partial: string,
  signal: AbortSignal | undefined,
  onProgress: ((received: number, total: number | null) => void) | undefined,
  redirects: number,
): Promise<void> {
  if (redirects > 5) {
    return Promise.reject(new Error(`Too many redirects downloading ${url}`));
  }
  return new Promise((resolve, reject) => {
    const client = url.startsWith("http://") ? http : https;
    const request = client.get(
      url,
      { headers: { "User-Agent": "ai-media-library" } },
      (response) => {
        const status = response.statusCode ?? 0;
        const location = response.headers.location;
        if (status >= 300 && status < 400 && location) {
          response.resume();
          const next = new URL(location, url).toString();
          downloadToPartial(next, partial, signal, onProgress, redirects + 1).then(resolve, reject);
          return;
        }
        if (status < 200 || status >= 300) {
          response.resume();
          reject(new Error(`Download failed (${status}) for ${url}`));
          return;
        }
        const totalHeader = response.headers["content-length"];
        const total = typeof totalHeader === "string" ? Number(totalHeader) : null;
        const file = fs.createWriteStream(partial);
        let received = 0;
        response.on("data", (chunk: Buffer) => {
          received += chunk.length;
          onProgress?.(received, Number.isFinite(total) ? total : null);
        });
        response.pipe(file);
        file.on("finish", () => {
          file.close(() => resolve());
        });
        file.on("error", reject);
        response.on("error", reject);
      },
    );
    request.on("error", reject);
    if (signal) {
      const abort = (): void => {
        request.destroy(new Error("Speech model download cancelled"));
      };
      if (signal.aborted) abort();
      else signal.addEventListener("abort", abort, { once: true });
    }
  });
}
