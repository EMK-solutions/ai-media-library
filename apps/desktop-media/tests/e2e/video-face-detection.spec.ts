import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "./fixtures/app-fixture";
import { clickSidebarLibraryRoot } from "./fixtures/desktop-sidebar";
import { mockFolderDialog } from "./fixtures/mock-dialog";

test.use({ e2eVideoFaceStub: true });

test.describe("Video face detection", () => {
  test("processes videos, stores a face track, and counts a clip with no face as done", async ({
    electronApp,
    mainWindow,
  }) => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "emk-video-face-e2e-"));
    fs.writeFileSync(path.join(folder, "person.mp4"), "video");
    fs.writeFileSync(path.join(folder, "no-face-video.mp4"), "video");
    try {
      const settings = await mainWindow.evaluate(async () => window.desktopApi.getSettings());
      expect(settings.faceDetection.detectFacesInVideoFiles).toBe(true);
      expect(settings.faceDetection.videoFaceSampleIntervalSec).toBe(1);

      await mainWindow.evaluate(() => {
        // @ts-expect-error test probe
        window.__videoFaceDetails = [];
        // @ts-expect-error test probe
        window.__videoFaceUnsub = window.desktopApi.pipelines.onJobProgress((event) => {
          if (event.pipelineId !== "face-detection") return;
          // @ts-expect-error test probe
          window.__videoFaceDetails.push(event.progress.details);
        });
      });

      await mockFolderDialog(electronApp, folder);
      await mainWindow.getByRole("button", { name: "Add library folder" }).click();
      await clickSidebarLibraryRoot(mainWindow, folder);
      const collapse = mainWindow.getByRole("button", { name: "Collapse background operations panel" });
      if (await collapse.isVisible().catch(() => false)) {
        await collapse.click();
      }
      await mainWindow.getByRole("button", { name: "More actions" }).click();
      await mainWindow.locator(".desktop-actions-menu").getByTitle("Start face detection").click();

      await expect.poll(async () => {
        return mainWindow.evaluate(async (folderPath) => {
          const coverage = await window.desktopApi.getFolderAiCoverage(folderPath, false);
          return { done: coverage.face.doneCount, failed: coverage.face.failedCount, total: coverage.face.totalImages };
        }, folder);
      }).toEqual({ done: 2, failed: 0, total: 2 });

      const progress = await mainWindow.evaluate(() => {
        // @ts-expect-error test probe
        const details = (window.__videoFaceDetails ?? []) as Array<{
          videoProcessed?: number;
          videosWithFaces?: number;
          currentFile?: string;
        } | null>;
        const rows = details.filter((row): row is { videoProcessed?: number; videosWithFaces?: number; currentFile?: string } => Boolean(row));
        return {
          last: [...rows].reverse().find((row) => typeof row.videoProcessed === "number") ?? null,
          files: rows.map((row) => row.currentFile ?? ""),
        };
      });
      expect(progress.last).toMatchObject({ videoProcessed: 2, videosWithFaces: 1 });
      expect(progress.files.some((file) => file.toLowerCase().includes("person.mp4"))).toBe(true);
      expect(progress.files.some((file) => file.toLowerCase().includes("no-face-video.mp4"))).toBe(true);
    } finally {
      await mainWindow.evaluate(() => {
        // @ts-expect-error test probe
        window.__videoFaceUnsub?.();
      });
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });
});
