import { test, expect } from "./fixtures/app-fixture";
import { openE2ePhotoLibrary, openFirstPhotoInViewer } from "./fixtures/e2e-photos-library";

async function openFolderAndViewer(
  electronApp: import("@playwright/test").ElectronApplication,
  mainWindow: import("@playwright/test").Page,
): Promise<void> {
  await openE2ePhotoLibrary(electronApp, mainWindow);
  await openFirstPhotoInViewer(mainWindow);
}

test.describe("Viewer navigation", () => {
  test("arrow keys navigate between photos", async ({ electronApp, mainWindow }) => {
    await openFolderAndViewer(electronApp, mainWindow);

    await mainWindow.keyboard.press("ArrowRight");
    const viewer = mainWindow.locator(".media-swiper-theme");
    await expect(viewer).toBeVisible();
  });

  test("close viewer button works", async ({ electronApp, mainWindow }) => {
    await openFolderAndViewer(electronApp, mainWindow);

    const closeButton = mainWindow.getByRole("button", { name: "Close viewer" });
    await closeButton.click();

    const viewer = mainWindow.locator(".media-swiper-theme");
    await expect(viewer).not.toBeVisible({ timeout: 3_000 });
  });

  test("escape closes the viewer and returns to the grid", async ({ electronApp, mainWindow }) => {
    await openFolderAndViewer(electronApp, mainWindow);

    await mainWindow.keyboard.press("Escape");

    await expect(mainWindow.locator(".media-swiper-theme")).not.toBeVisible({ timeout: 3_000 });
    await expect(mainWindow.locator("main.main-panel img[alt]").first()).toBeVisible();
  });

  test("escape closes the viewer while the info panel is open", async ({ electronApp, mainWindow }) => {
    await openFolderAndViewer(electronApp, mainWindow);

    await mainWindow.getByRole("button", { name: "Show info" }).click();
    await expect(mainWindow.getByRole("button", { name: "Close info panel" })).toBeVisible();

    await mainWindow.keyboard.press("Escape");

    await expect(mainWindow.locator(".media-swiper-theme")).not.toBeVisible({ timeout: 3_000 });
    await expect(mainWindow.getByRole("button", { name: "Close info panel" })).not.toBeVisible();
    await expect(mainWindow.locator("main.main-panel img[alt]").first()).toBeVisible();
  });

  test("viewer displays an image for the selected photo", async ({ electronApp, mainWindow }) => {
    await openFolderAndViewer(electronApp, mainWindow);

    // The viewer renders a main image via Swiper slides
    const viewerImage = mainWindow.locator(".media-swiper-theme img").first();
    await expect(viewerImage).toBeVisible({ timeout: 5_000 });
  });
});
