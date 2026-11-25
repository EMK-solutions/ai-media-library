import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures/app-fixture";
import { clickSidebarLibraryRoot, mainDesktopSidebar } from "./fixtures/desktop-sidebar";
import { mockFolderDialog } from "./fixtures/mock-dialog";

test.use({ e2eSpeechModelStub: true });

interface SpeechProbe {
  text?: string;
  segments?: Array<{ words?: Array<{ text: string; filler?: boolean }> }>;
  silence_spans?: unknown[];
}

async function openSpeechSettings(mainWindow: Page): Promise<void> {
  await mainWindow.getByRole("navigation").getByText("Settings", { exact: true }).click();
  await mainWindow.getByText("Video speech to text", { exact: true }).click();
}

async function collapseBackgroundOperations(mainWindow: Page): Promise<void> {
  const collapse = mainWindow.getByRole("button", { name: "Collapse background operations panel" });
  if (await collapse.isVisible().catch(() => false)) {
    await collapse.click();
  }
}

async function openFolderSummary(mainWindow: Page, folder: string): Promise<void> {
  await mainWindow.keyboard.press("Escape");
  const toolbarSummary = mainWindow.getByRole("button", { name: "Open folder analysis summary" });
  if (await toolbarSummary.isVisible().catch(() => false)) {
    await toolbarSummary.click();
  } else {
    const normalized = path.normalize(folder);
    const byPath = mainDesktopSidebar(mainWindow).getByRole("button", { name: normalized, exact: true });
    const folderButton = (await byPath.count()) > 0
      ? byPath
      : mainDesktopSidebar(mainWindow).getByRole("button", { name: path.basename(folder), exact: true });
    await folderButton.click({ button: "right" });
    await mainWindow
      .locator("[data-sidebar-tree-menu]")
      .getByRole("button", { name: "Folder AI analysis summary", exact: true })
      .click();
  }
  await expect(mainWindow.getByRole("heading", { name: "Video speech to text" })).toBeVisible({ timeout: 20_000 });
}

async function enableSpeechModel(mainWindow: Page): Promise<void> {
  await openSpeechSettings(mainWindow);
  const checkbox = mainWindow.getByRole("checkbox", { name: /Enable video speech to text/i });
  await checkbox.click();
  await mainWindow.getByRole("button", { name: "Download", exact: true }).click();
  await expect(checkbox).toBeChecked();
  const queue = mainWindow.getByLabel("Pipeline queue");
  await expect(queue).toContainText("Completed (1)", { timeout: 20_000 });
  await queue.getByRole("button", { name: /Completed/ }).click();
  await expect(mainWindow.getByRole("heading", { name: "Video speech model" })).toBeVisible();
}

test.describe("Video speech model download", () => {
  test("cancel leaves speech to text off", async ({ mainWindow }) => {
    await openSpeechSettings(mainWindow);
    const checkbox = mainWindow.getByRole("checkbox", { name: /Enable video speech to text/i });
    await expect(checkbox).not.toBeChecked();
    await expect(mainWindow.locator("#speech-language")).toHaveValue("auto");
    await checkbox.click();
    await expect(mainWindow.getByText("Download speech model?", { exact: true })).toBeVisible();
    await expect(mainWindow.getByText(/approximately 600 MB/i)).toBeVisible();
    await mainWindow.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(checkbox).not.toBeChecked();
  });

  test("confirming download reports downloading then ready", async ({ mainWindow }) => {
    await mainWindow.evaluate(() => {
      // @ts-expect-error test probe
      window.__speechPhases = [];
      // @ts-expect-error test probe
      window.__speechUnsub = window.desktopApi.pipelines.onJobProgress((event) => {
        if (event.pipelineId !== "speech-model-init") return;
        // @ts-expect-error test probe
        window.__speechPhases.push(event.progress.phase);
      });
    });
    try {
      await enableSpeechModel(mainWindow);
      const phases = await mainWindow.evaluate(() => {
        // @ts-expect-error test probe
        return (window.__speechPhases ?? []) as string[];
      });
      expect(phases).toContain("downloading");
      expect(phases).toContain("ready");
    } finally {
      await mainWindow.evaluate(() => {
        // @ts-expect-error test probe
        window.__speechUnsub?.();
      });
    }
  });
});

test.describe("Video speech model local copy", () => {
  test.use({ e2eSpeechModelCached: true });

  test("offers use local copy and download again", async ({ mainWindow }) => {
    await openSpeechSettings(mainWindow);
    await mainWindow.getByRole("checkbox", { name: /Enable video speech to text/i }).click();
    await expect(mainWindow.getByText("Use local speech model?", { exact: true })).toBeVisible();
    await expect(mainWindow.getByRole("button", { name: "Use local copy", exact: true })).toBeVisible();
    await expect(mainWindow.getByRole("button", { name: "Download again", exact: true })).toBeVisible();
    await mainWindow.getByRole("button", { name: "Use local copy", exact: true }).click();
    const queue = mainWindow.getByLabel("Pipeline queue");
    await expect(queue).toContainText("Completed (1)", { timeout: 20_000 });
    await queue.getByRole("button", { name: /Completed/ }).click();
    await expect(mainWindow.getByRole("heading", { name: "Video speech model" })).toBeVisible();
  });
});

test.describe("Video speech to text pipeline", () => {
  test("play stays disabled until the model is ready, then transcribes only videos", async ({
    electronApp,
    mainWindow,
  }) => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "emk-speech-e2e-"));
    const videoPath = path.join(folder, "clip.mp4");
    const imagePath = path.join(folder, "photo.jpg");
    fs.writeFileSync(videoPath, "video");
    fs.writeFileSync(imagePath, "image");
    try {
      await mockFolderDialog(electronApp, folder);
      await mainWindow.getByRole("button", { name: "Add library folder" }).click();
      await clickSidebarLibraryRoot(mainWindow, folder);
      await openFolderSummary(mainWindow, folder);
      const play = mainWindow.getByRole("button", { name: "Run Video speech to text" });
      await expect(play).toBeDisabled();

      await enableSpeechModel(mainWindow);
      await mainWindow.getByRole("navigation").getByText("Folders", { exact: true }).click();
      await openFolderSummary(mainWindow, folder);
      await expect(play).toBeEnabled({ timeout: 15_000 });
      await collapseBackgroundOperations(mainWindow);
      await play.click();

      await expect.poll(async () => {
        return mainWindow.evaluate(async (sourcePath) => {
          const rows = await window.desktopApi.getMediaItemsByPaths([sourcePath]);
          const metadata = rows[sourcePath]?.aiMetadata as { speech_analysis?: SpeechProbe } | null;
          return metadata?.speech_analysis?.text ?? "";
        }, videoPath);
      }).toBe("hello um there");

      const speech = await mainWindow.evaluate(async (sourcePath) => {
        const rows = await window.desktopApi.getMediaItemsByPaths([sourcePath]);
        return rows[sourcePath]?.aiMetadata as { speech_analysis?: SpeechProbe } | null;
      }, videoPath);
      expect(speech?.speech_analysis?.segments?.[0]?.words).toBeUndefined();
      expect(speech?.speech_analysis?.silence_spans?.length).toBeGreaterThan(0);

      const image = await mainWindow.evaluate(async (sourcePath) => {
        const rows = await window.desktopApi.getMediaItemsByPaths([sourcePath]);
        return rows[sourcePath]?.aiMetadata ?? null;
      }, imagePath);
      expect(JSON.stringify(image ?? {})).not.toContain("speech_analysis");

      await mainWindow.getByRole("button", { name: "Back to images" }).click();
      await mainWindow.getByText("clip.mp4", { exact: true }).click();
      await expect(mainWindow.locator(".media-swiper-theme")).toBeVisible({ timeout: 20_000 });
      await mainWindow.getByRole("button", { name: "Show info" }).click();
      await expect(mainWindow.getByRole("heading", { name: "Speech" })).toBeVisible();
      await expect(mainWindow.getByText("hello um there")).toBeVisible();
      await mainWindow.getByRole("button", { name: "Metadata" }).click();
      await mainWindow.getByRole("button", { name: "Expand speech_analysis" }).click();
      await expect(mainWindow.getByText("hello um there").last()).toBeVisible();
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });

  test("word timestamps and filler detection follow settings, and a high silence gap stores no spans", async ({
    electronApp,
    mainWindow,
  }) => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "emk-speech-options-"));
    const videoPath = path.join(folder, "options.mp4");
    fs.writeFileSync(videoPath, "video");
    try {
      await enableSpeechModel(mainWindow);
      await mainWindow.getByRole("checkbox", { name: "Store word timestamps" }).check();
      await mainWindow.getByRole("checkbox", { name: "Detect filler words" }).check();
      const silenceField = mainWindow
        .getByRole("heading", { name: "Minimum silence (ms)", exact: true })
        .locator("xpath=ancestor::div[contains(@class,'justify-between')]")
        .getByRole("spinbutton");
      await silenceField.fill("5000");
      await silenceField.press("Enter");
      await mainWindow.getByRole("navigation").getByText("Folders", { exact: true }).click();
      await mockFolderDialog(electronApp, folder);
      await mainWindow.getByRole("button", { name: "Add library folder" }).click();
      await clickSidebarLibraryRoot(mainWindow, folder);
      await openFolderSummary(mainWindow, folder);
      await collapseBackgroundOperations(mainWindow);
      await mainWindow.getByRole("button", { name: "Run Video speech to text" }).click();
      await expect.poll(async () => {
        return mainWindow.evaluate(async (sourcePath) => {
          const rows = await window.desktopApi.getMediaItemsByPaths([sourcePath]);
          const speech = (rows[sourcePath]?.aiMetadata as { speech_analysis?: SpeechProbe } | null)?.speech_analysis;
          const um = speech?.segments?.[0]?.words?.find((word) => word.text === "um");
          return { filler: um?.filler ?? null, silence: speech?.silence_spans?.length ?? -1 };
        }, videoPath);
      }).toEqual({ filler: true, silence: 0 });
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });

  test("a failed video is counted as failed and a second missing run skips successes", async ({
    electronApp,
    mainWindow,
  }) => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "emk-speech-fail-"));
    fs.writeFileSync(path.join(folder, "keep.mp4"), "video");
    fs.writeFileSync(path.join(folder, "fail-speech.mp4"), "video");
    try {
      await enableSpeechModel(mainWindow);
      await mainWindow.getByRole("navigation").getByText("Folders", { exact: true }).click();
      await mockFolderDialog(electronApp, folder);
      await mainWindow.getByRole("button", { name: "Add library folder" }).click();
      await clickSidebarLibraryRoot(mainWindow, folder);
      await openFolderSummary(mainWindow, folder);
      await collapseBackgroundOperations(mainWindow);
      await mainWindow.getByRole("button", { name: "Run Video speech to text" }).click();
      await expect.poll(async () => {
        return mainWindow.evaluate(async (folderPath) => {
          const coverage = await window.desktopApi.getFolderAiCoverage(folderPath, false);
          return { done: coverage.speech.doneCount, failed: coverage.speech.failedCount };
        }, folder);
      }).toEqual({ done: 1, failed: 1 });

      await mainWindow.evaluate(() => {
        // @ts-expect-error test probe
        window.__speechSkipped = [];
        // @ts-expect-error test probe
        window.__speechSkipUnsub = window.desktopApi.pipelines.onJobProgress((event) => {
          if (event.pipelineId !== "video-speech-to-text") return;
          const details = event.progress.details as { skipped?: number } | null;
          if (typeof details?.skipped === "number") {
            // @ts-expect-error test probe
            window.__speechSkipped.push(details.skipped);
          }
        });
      });
      const folderButton = mainWindow.getByRole("complementary").getByRole("button", { name: path.normalize(folder), exact: true });
      await folderButton.click({ button: "right" });
      await mainWindow.locator("[data-sidebar-tree-menu]").getByRole("button", { name: "Start video speech to text" }).click();
      await expect.poll(async () => {
        return mainWindow.evaluate(() => {
          // @ts-expect-error test probe
          const values = (window.__speechSkipped ?? []) as number[];
          return values.includes(1);
        });
      }).toBe(true);
    } finally {
      await mainWindow.evaluate(() => {
        // @ts-expect-error test probe
        window.__speechSkipUnsub?.();
      });
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });

  test("a video without voice counts as transcribed, not failed", async ({ electronApp, mainWindow }) => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "emk-speech-novoice-"));
    const videoPath = path.join(folder, "no-voice.mp4");
    fs.writeFileSync(videoPath, "video");
    try {
      await enableSpeechModel(mainWindow);
      await mainWindow.getByRole("navigation").getByText("Folders", { exact: true }).click();
      await mockFolderDialog(electronApp, folder);
      await mainWindow.getByRole("button", { name: "Add library folder" }).click();
      await clickSidebarLibraryRoot(mainWindow, folder);
      await openFolderSummary(mainWindow, folder);
      await collapseBackgroundOperations(mainWindow);
      await mainWindow.getByRole("button", { name: "Run Video speech to text" }).click();
      await expect.poll(async () => {
        return mainWindow.evaluate(async (folderPath) => {
          const coverage = await window.desktopApi.getFolderAiCoverage(folderPath, false);
          return { done: coverage.speech.doneCount, failed: coverage.speech.failedCount };
        }, folder);
      }).toEqual({ done: 1, failed: 0 });
      const speech = await mainWindow.evaluate(async (sourcePath) => {
        const rows = await window.desktopApi.getMediaItemsByPaths([sourcePath]);
        return (rows[sourcePath]?.aiMetadata as { speech_analysis?: { has_speech?: boolean; text?: string } } | null)
          ?.speech_analysis;
      }, videoPath);
      expect(speech).toMatchObject({ has_speech: false, text: "" });
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });

  test("a folder where every video failed shows a red card, not green", async ({ electronApp, mainWindow }) => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "emk-speech-allfail-"));
    fs.writeFileSync(path.join(folder, "fail-speech-1.mp4"), "video");
    fs.writeFileSync(path.join(folder, "fail-speech-2.mp4"), "video");
    try {
      await enableSpeechModel(mainWindow);
      await mainWindow.getByRole("navigation").getByText("Folders", { exact: true }).click();
      await mockFolderDialog(electronApp, folder);
      await mainWindow.getByRole("button", { name: "Add library folder" }).click();
      await clickSidebarLibraryRoot(mainWindow, folder);
      await openFolderSummary(mainWindow, folder);
      await collapseBackgroundOperations(mainWindow);
      await mainWindow.getByRole("button", { name: "Run Video speech to text" }).click();
      await expect.poll(async () => {
        return mainWindow.evaluate(async (folderPath) => {
          const coverage = await window.desktopApi.getFolderAiCoverage(folderPath, false);
          return { done: coverage.speech.doneCount, failed: coverage.speech.failedCount, label: coverage.speech.label };
        }, folder);
      }).toEqual({ done: 0, failed: 2, label: "not_done" });

      await mainWindow.getByRole("button", { name: "Back to images" }).click();
      await openFolderSummary(mainWindow, folder);
      const speechCard = mainWindow
        .getByRole("heading", { name: "Video speech to text" })
        .locator("xpath=ancestor::section[contains(@class,'border')]");
      await expect(speechCard).toHaveClass(/border-destructive/);
      await expect(speechCard).not.toHaveClass(/border-success/);
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });
});

test.describe("Video speech to text progress and cancel", () => {
  test.use({ e2eSpeechStubDelayMs: 8_000 });

  test("shows the current file and model loading hint, and cancel stops the running file", async ({
    electronApp,
    mainWindow,
  }) => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "emk-speech-cancel-"));
    fs.writeFileSync(path.join(folder, "first-talk.mp4"), "video");
    fs.writeFileSync(path.join(folder, "second-talk.mp4"), "video");
    try {
      await enableSpeechModel(mainWindow);
      await mainWindow.getByRole("navigation").getByText("Folders", { exact: true }).click();
      await mockFolderDialog(electronApp, folder);
      await mainWindow.getByRole("button", { name: "Add library folder" }).click();
      await clickSidebarLibraryRoot(mainWindow, folder);
      await openFolderSummary(mainWindow, folder);
      await collapseBackgroundOperations(mainWindow);
      await mainWindow.getByRole("button", { name: "Run Video speech to text" }).click();

      const expand = mainWindow.getByRole("button", { name: "Expand background operations panel" });
      if (await expand.isVisible().catch(() => false)) {
        await expand.click();
      }
      const queue = mainWindow.getByLabel("Pipeline queue");
      await expect(queue.getByText(/Processing: (first|second)-talk\.mp4/)).toBeVisible({ timeout: 20_000 });
      await expect(queue.getByText(/Loading speech model large-v3-turbo-q5_0/)).toBeVisible();

      const cancelledAt = Date.now();
      await queue.getByRole("button", { name: /^Cancel .*speech/i }).click();
      await expect.poll(async () => {
        return mainWindow.evaluate(async () => {
          const snapshot = await window.desktopApi.pipelines.getSnapshot();
          return snapshot.running.some((bundle) => bundle.jobs.some((job) => job.pipelineId === "video-speech-to-text"));
        });
      }, { timeout: 6_000 }).toBe(false);
      expect(Date.now() - cancelledAt).toBeLessThan(5_000);

      const coverage = await mainWindow.evaluate(async (folderPath) => {
        return window.desktopApi.getFolderAiCoverage(folderPath, false);
      }, folder);
      expect({ done: coverage.speech.doneCount, failed: coverage.speech.failedCount }).toEqual({ done: 0, failed: 0 });
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });
});
