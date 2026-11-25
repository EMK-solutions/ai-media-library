import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "../e2e/fixtures/app-fixture";
import { clickSidebarLibraryRoot } from "../e2e/fixtures/desktop-sidebar";
import { mockFolderDialog } from "../e2e/fixtures/mock-dialog";

const configuredDir = process.env.EMK_E2E_SPEECH_VIDEOS_DIR?.trim();
const speechDir = configuredDir && configuredDir.length > 0
  ? configuredDir
  : path.resolve(__dirname, "../../test-assets/e2e-speech-videos");

/** One visible person from the start. The stored row count can be 2 when a second pose is kept. */
const FACE_CLIPS: Array<{ name: string; minFaces: number; maxFaces: number }> = [
  { name: "Human role in AI-driven world v01.mp4", minFaces: 1, maxFaces: 2 },
  { name: "Игорь - с 50летием.mp4", minFaces: 1, maxFaces: 2 },
];

const runtimeRoot = process.env.EMK_E2E_REAL_FACE_RUNTIME_ROOT?.trim()
  || (process.env.APPDATA
    ? path.join(process.env.APPDATA, "AI Media Library")
    : path.join(os.homedir(), ".emk-desktop-media-e2e-real-face"));

test.use({ e2eRuntimeRootPath: runtimeRoot, e2eVideoFaceStub: false });

test.describe("Real video face detection", () => {
  test("finds one person in each talking-head clip", async ({ electronApp, mainWindow }) => {
    const missing = FACE_CLIPS.filter((clip) => !fs.existsSync(path.join(speechDir, clip.name)));
    test.skip(missing.length > 0, `Missing speech clips: ${missing.map((clip) => clip.name).join(", ")}`);

    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "emk-real-video-face-"));
    for (const clip of FACE_CLIPS) {
      fs.copyFileSync(path.join(speechDir, clip.name), path.join(folder, clip.name));
    }

    try {
      await mockFolderDialog(electronApp, folder);
      await mainWindow.getByRole("button", { name: "Add library folder" }).click();
      await clickSidebarLibraryRoot(mainWindow, folder);
      const collapse = mainWindow.getByRole("button", { name: "Collapse background operations panel" });
      if (await collapse.isVisible().catch(() => false)) {
        await collapse.click();
      }
      await mainWindow.getByRole("button", { name: "More actions" }).click();
      await mainWindow.locator(".desktop-actions-menu").getByTitle("Start face detection").click();

      const clipPaths = FACE_CLIPS.map((clip) => path.join(folder, clip.name));
      await expect.poll(async () => {
        return mainWindow.evaluate(async (folderPath) => {
          const coverage = await window.desktopApi.getFolderAiCoverage(folderPath, false);
          return { done: coverage.face.doneCount, failed: coverage.face.failedCount, total: coverage.face.totalImages };
        }, folder);
      }, { timeout: 3_000_000 }).toEqual({ done: FACE_CLIPS.length, failed: 0, total: FACE_CLIPS.length });

      const counts = await mainWindow.evaluate(async (paths) => {
        const rows = await window.desktopApi.getMediaItemsByPaths(paths);
        const result: Record<string, number> = {};
        for (const filePath of paths) {
          const mediaId = rows[filePath]?.id;
          if (!mediaId) {
            result[filePath] = -1;
            continue;
          }
          const faces = await window.desktopApi.listFaceInstancesForMediaItem(mediaId);
          result[filePath] = faces.length;
        }
        return result;
      }, clipPaths);

      for (const clip of FACE_CLIPS) {
        const count = counts[path.join(folder, clip.name)] ?? -1;
        expect(count, clip.name).toBeGreaterThanOrEqual(clip.minFaces);
        expect(count, clip.name).toBeLessThanOrEqual(clip.maxFaces);
      }
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });
});
