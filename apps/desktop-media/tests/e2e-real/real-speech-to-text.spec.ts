import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, expect } from "../e2e/fixtures/app-fixture";
import { clickSidebarLibraryRoot } from "../e2e/fixtures/desktop-sidebar";
import { mockFolderDialog } from "../e2e/fixtures/mock-dialog";

const configuredDir = process.env.EMK_E2E_SPEECH_VIDEOS_DIR?.trim();
const speechDir = configuredDir && configuredDir.length > 0
  ? configuredDir
  : path.resolve(__dirname, "../../test-assets/e2e-speech-videos");
const expectationsPath = path.join(speechDir, "expectations.json");
const runtimeRoot =
  process.env.EMK_E2E_REAL_SPEECH_RUNTIME_ROOT?.trim() ||
  path.join(os.homedir(), ".emk-desktop-media-e2e-real-speech");

test.use({ e2eRuntimeRootPath: runtimeRoot, e2eSpeechModelStub: false });

function normalizePhrase(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

test.describe("Real Whisper speech to text", () => {
  test("transcribes the local speech clips", async ({ electronApp, mainWindow }) => {
    test.skip(!fs.existsSync(expectationsPath), `Missing ${expectationsPath}`);
    const expectations = JSON.parse(fs.readFileSync(expectationsPath, "utf8")) as Record<
      string,
      { language?: string; contains?: string[] }
    >;
    const clips = Object.keys(expectations).filter((name) => fs.existsSync(path.join(speechDir, name)));
    test.skip(clips.length === 0, `No speech clips in ${speechDir}`);

    await mainWindow.getByRole("navigation").getByText("Settings", { exact: true }).click();
    await mainWindow.getByText("Video speech to text", { exact: true }).click();
    const checkbox = mainWindow.getByRole("checkbox", { name: /Enable video speech to text/i });
    if (!(await checkbox.isChecked())) {
      await checkbox.click();
      const download = mainWindow.getByRole("button", { name: "Download", exact: true });
      const useLocal = mainWindow.getByRole("button", { name: "Use local copy", exact: true });
      if (await useLocal.isVisible().catch(() => false)) {
        await useLocal.click();
      } else {
        await download.click();
      }
    }
    const queue = mainWindow.getByLabel("Pipeline queue");
    await expect(queue).toContainText("Completed (1)", { timeout: 1_200_000 });
    await queue.getByRole("button", { name: /Completed/ }).click();
    await expect(queue.getByRole("heading", { name: "Video speech model" })).toBeVisible();
    await expect(mainWindow.locator("#speech-language")).toHaveValue("auto");

    await mainWindow.getByRole("navigation").getByText("Folders", { exact: true }).click();
    await mockFolderDialog(electronApp, speechDir);
    await mainWindow.getByRole("button", { name: "Add library folder" }).click();
    await clickSidebarLibraryRoot(mainWindow, speechDir);
    const folderButton = mainWindow.getByRole("complementary").getByRole("button", { name: path.normalize(speechDir), exact: true });
    await folderButton.click({ button: "right" });
    await mainWindow
      .locator("[data-sidebar-tree-menu]")
      .getByRole("button", { name: "Folder AI analysis summary", exact: true })
      .click();
    await expect(mainWindow.getByRole("button", { name: "Run Video speech to text" })).toBeEnabled({ timeout: 30_000 });
    const collapse = mainWindow.getByRole("button", { name: "Collapse background operations panel" });
    if (await collapse.isVisible().catch(() => false)) {
      await collapse.click();
    }
    await mainWindow.getByRole("button", { name: "Run Video speech to text" }).click();

    const clipPaths = clips.map((name) => path.join(speechDir, name));
    await expect.poll(async () => {
      return mainWindow.evaluate(async (paths) => {
        const rows = await window.desktopApi.getMediaItemsByPaths(paths);
        return paths.every((filePath) => {
          const speech = rows[filePath]?.aiMetadata as { speech_analysis?: { text?: string } } | null;
          return typeof speech?.speech_analysis?.text === "string";
        });
      }, clipPaths);
    }, { timeout: 1_800_000 }).toBe(true);

    const transcripts = await mainWindow.evaluate(async (paths) => {
      const rows = await window.desktopApi.getMediaItemsByPaths(paths);
      return Object.fromEntries(paths.map((filePath) => {
        const speech = rows[filePath]?.aiMetadata as { speech_analysis?: { text?: string; language?: string | null } } | null;
        return [filePath, speech?.speech_analysis ?? { text: "", language: null }];
      }));
    }, clipPaths) as Record<string, { text?: string; language?: string | null }>;

    for (const name of clips) {
      const result = transcripts[path.join(speechDir, name)];
      const transcript = normalizePhrase(result?.text ?? "");
      const expectedLanguage = expectations[name]?.language;
      if (expectedLanguage) {
        expect(result?.language, name).toBe(expectedLanguage);
      }
      for (const phrase of expectations[name]?.contains ?? []) {
        expect(transcript, name).toContain(normalizePhrase(phrase));
      }
    }
  });
});
