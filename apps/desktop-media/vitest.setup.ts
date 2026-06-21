import { vi } from "vitest";

/**
 * Unit tests run on Linux CI without a downloaded Electron binary. Modules that
 * transitively `import "electron"` (e.g. keyword reranker → nomic embedder,
 * duplicate delete definition → shell.trashItem) must not load the real package.
 * Individual specs may override with their own vi.mock("electron", …).
 */
vi.mock("electron", () => ({
  app: {
    getPath: () => "/tmp/emk-vitest-user-data",
    getName: () => "desktop-media-test",
    getVersion: () => "0.0.0-test",
  },
  shell: {
    trashItem: vi.fn(async () => undefined),
    showItemInFolder: vi.fn(),
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
  },
  BrowserWindow: vi.fn(),
}));
