import { expect, test } from "./fixtures/app-fixture";
import {
  E2E_MEDIA_MIXED_DIR,
  hasE2eMixedMediaAssets,
  openE2eMixedMediaLibrary,
  readMixedMediaNames,
  switchToGridView,
  switchToListView,
} from "./fixtures/e2e-media-mixed-library";

const mixedAssetsMissing = `Missing mixed media fixtures under ${E2E_MEDIA_MIXED_DIR}`;
const autoPlayVideoOnSelectionLabel = "Automatically start playback on video selection";

async function openViewerFromListRow(mainWindow: import("@playwright/test").Page, title: string): Promise<void> {
  // Prefer role + exact name over `hasText` (substring) matching; click the title so the event
  // bubbles to the row `article` reliably on Windows CI (see dev push CI for viewer-video).
  const titleHeading = mainWindow.getByRole("heading", { level: 3, name: title, exact: true }).first();
  await expect(titleHeading).toBeVisible({ timeout: 15_000 });
  await titleHeading.scrollIntoViewIfNeeded();
  await titleHeading.click();
  await expect(mainWindow.locator(".media-swiper-theme")).toBeVisible({ timeout: 30_000 });
}

async function openViewerFromGridByTitle(mainWindow: import("@playwright/test").Page, title: string): Promise<void> {
  const grid = mainWindow.getByTestId("desktop-folder-thumbnails-grid");
  await grid.getByText(title, { exact: true }).click({ force: true });
  await expect(mainWindow.locator(".media-swiper-theme")).toBeVisible({ timeout: 25_000 });
}

interface ViewerVideoPlaybackSnapshot {
  audible: number;
  carouselPaused: boolean | null;
  infoPaused: boolean | null;
  infoTime: number | null;
  carouselCount: number;
  infoCount: number;
}

async function readViewerVideoPlayback(
  mainWindow: import("@playwright/test").Page,
): Promise<ViewerVideoPlaybackSnapshot | null> {
  return mainWindow.evaluate(() => {
    const root = document.querySelector(".media-swiper-theme");
    if (!root) {
      return null;
    }
    const videos = Array.from(root.querySelectorAll("video"));
    const audible = videos.filter((node) => {
      const video = node as HTMLVideoElement;
      return !video.paused && !video.muted;
    }).length;
    const carousel = root.querySelector(
      ".swiper-slide-active video[data-emk-viewer-video='carousel']",
    ) as HTMLVideoElement | null;
    const info = root.querySelector("video[data-emk-viewer-video='info-panel']") as HTMLVideoElement | null;
    return {
      audible,
      carouselPaused: carousel ? carousel.paused : null,
      infoPaused: info ? info.paused : null,
      infoTime: info ? info.currentTime : null,
      carouselCount: root.querySelectorAll("video[data-emk-viewer-video='carousel']").length,
      infoCount: root.querySelectorAll("video[data-emk-viewer-video='info-panel']").length,
    };
  });
}

async function pauseActiveCarouselVideo(
  mainWindow: import("@playwright/test").Page,
): Promise<{ currentTime: number; paused: boolean }> {
  return mainWindow.evaluate(async () => {
    const video = document.querySelector(
      ".media-swiper-theme .swiper-slide-active video[data-emk-viewer-video='carousel']",
    ) as HTMLVideoElement | null;
    if (!video) {
      throw new Error("Carousel video is not mounted");
    }
    if (video.readyState < 1) {
      await new Promise<void>((resolve) => {
        video.addEventListener("loadedmetadata", () => resolve(), { once: true });
      });
    }
    const target =
      Number.isFinite(video.duration) && video.duration > 0.4 ? Math.min(1, video.duration / 2) : 0;
    if (target > 0 && Math.abs(video.currentTime - target) > 0.05) {
      await new Promise<void>((resolve) => {
        video.addEventListener("seeked", () => resolve(), { once: true });
        video.currentTime = target;
      });
    }
    video.pause();
    return { currentTime: video.currentTime, paused: video.paused };
  });
}

async function expectAudibleVideosStayPaused(
  mainWindow: import("@playwright/test").Page,
  durationMs: number,
): Promise<void> {
  const result = await mainWindow.evaluate(async (ms) => {
    const started = performance.now();
    while (performance.now() - started < ms) {
      const playing = Array.from(document.querySelectorAll(".media-swiper-theme video")).filter((node) => {
        const video = node as HTMLVideoElement;
        return !video.paused && !video.muted;
      });
      if (playing.length > 0) {
        return "playing";
      }
      await new Promise((resolve) => {
        window.setTimeout(resolve, 100);
      });
    }
    return "paused";
  }, durationMs);
  expect(result).toBe("paused");
}

async function currentViewerVideoPaused(mainWindow: import("@playwright/test").Page): Promise<boolean | null> {
  return mainWindow.evaluate(() => {
    // `[controls]` pins to the main viewer's slide video; the thumb rail's active <video>
    // also lives under `.swiper-slide-active` but is muted/aria-hidden without controls.
    const video = document.querySelector(
      ".media-swiper-theme .swiper-slide-active video[controls]",
    ) as HTMLVideoElement | null;
    return video ? video.paused : null;
  });
}

async function advanceUntilVideo(
  mainWindow: import("@playwright/test").Page,
  options: {
    direction?: "next" | "prev";
    expectedPaused: boolean;
    maxSteps?: number;
    timeoutPerStepMs?: number;
  },
): Promise<void> {
  const direction = options.direction ?? "next";
  const maxSteps = options.maxSteps ?? 6;
  const timeoutPerStepMs = options.timeoutPerStepMs ?? 5_000;

  for (let i = 0; i < maxSteps; i += 1) {
    await mainWindow
      .getByRole("button", { name: direction === "next" ? "Next item" : "Previous item" })
      .click();
    try {
      await expect
        .poll(async () => currentViewerVideoPaused(mainWindow), { timeout: timeoutPerStepMs })
        .not.toBeNull();
      await expect
        .poll(async () => currentViewerVideoPaused(mainWindow), { timeout: timeoutPerStepMs })
        .toBe(options.expectedPaused);
      return;
    } catch {
      // The next item can be another image. Continue until a video slide becomes active.
    }
  }

  throw new Error(`Did not reach a video slide after ${maxSteps} ${direction} item clicks`);
}

async function selectImageBeforeVideoInViewer(
  mainWindow: import("@playwright/test").Page,
): Promise<"next" | "prev" | null> {
  const direction = await mainWindow.evaluate(() => {
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.media-swiper-theme button[aria-label^="Go to item"]'),
    );
    const videoIndex = buttons.findIndex(
      (button) => button.querySelector("video") || button.textContent?.includes("Video"),
    );
    if (videoIndex < 0) {
      return null;
    }

    const previous = buttons[videoIndex - 1];
    if (previous?.querySelector("img")) {
      previous.click();
      return "next";
    }

    const next = buttons[videoIndex + 1];
    if (next?.querySelector("img")) {
      next.click();
      return "prev";
    }

    return null;
  });
  expect(direction).not.toBeNull();
  await expect(mainWindow.locator(".media-swiper-theme .swiper-slide-active img[data-emk-fit-mode]")).toBeVisible();
  return direction;
}

async function setAutoPlayVideoOnSelection(
  mainWindow: import("@playwright/test").Page,
  enabled: boolean,
): Promise<void> {
  await mainWindow.getByText("Settings", { exact: true }).click();
  const mediaViewerSection = mainWindow.locator("details").filter({ hasText: "Image / Video viewer" }).first();
  const sectionOpen = await mediaViewerSection.evaluate((el) => el.hasAttribute("open"));
  if (!sectionOpen) {
    await mediaViewerSection.locator("summary").click();
  }
  const checkbox = mainWindow.getByLabel(autoPlayVideoOnSelectionLabel, { exact: true });
  await expect(checkbox).toBeVisible({ timeout: 10_000 });
  await checkbox.setChecked(enabled);
  await expect
    .poll(
      async () =>
        mainWindow.evaluate(async () => {
          const settings = await window.desktopApi.getSettings();
          return settings.mediaViewer.autoPlayVideoOnOpen;
        }),
      { timeout: 10_000 },
    )
    .toBe(enabled);
  await mainWindow.getByText("Folders", { exact: true }).click();
}

test.describe("Viewer mixed media", () => {
  test("opening video from folder grid opens viewer and auto-plays", async ({ electronApp, mainWindow }) => {
    test.skip(!hasE2eMixedMediaAssets(), mixedAssetsMissing);

    await openE2eMixedMediaLibrary(electronApp, mainWindow);
    await switchToGridView(mainWindow);

    const { videoNames } = await readMixedMediaNames(mainWindow);
    expect(videoNames.length).toBeGreaterThan(0);
    await openViewerFromGridByTitle(mainWindow, videoNames[0]);

    await expect
      .poll(async () => currentViewerVideoPaused(mainWindow), { timeout: 10_000 })
      .toBe(false);
  });

  test("viewer thumb strip shows video preview (not only main stage)", async ({ electronApp, mainWindow }) => {
    test.skip(!hasE2eMixedMediaAssets(), mixedAssetsMissing);

    await openE2eMixedMediaLibrary(electronApp, mainWindow);
    await switchToGridView(mainWindow);

    const { videoNames } = await readMixedMediaNames(mainWindow);
    expect(videoNames.length).toBeGreaterThan(0);
    await openViewerFromGridByTitle(mainWindow, videoNames[0]);

    await expect
      .poll(
        async () =>
          mainWindow.evaluate(() => {
            const root = document.querySelector(".media-swiper-theme");
            if (!root) return 0;
            return root.querySelectorAll("video").length;
          }),
        { timeout: 10_000 },
      )
      .toBeGreaterThanOrEqual(2);
  });

  test("opening video from folder list opens viewer and auto-plays", async ({ electronApp, mainWindow }) => {
    test.skip(!hasE2eMixedMediaAssets(), mixedAssetsMissing);

    await openE2eMixedMediaLibrary(electronApp, mainWindow);
    await switchToListView(mainWindow);

    const { videoNames } = await readMixedMediaNames(mainWindow);
    expect(videoNames.length).toBeGreaterThan(0);
    await openViewerFromListRow(mainWindow, videoNames[0]);

    await expect
      .poll(async () => currentViewerVideoPaused(mainWindow), { timeout: 10_000 })
      .toBe(false);
  });

  test("manual navigation to video auto-plays when setting is enabled", async ({ electronApp, mainWindow }) => {
    test.skip(!hasE2eMixedMediaAssets(), mixedAssetsMissing);

    await openE2eMixedMediaLibrary(electronApp, mainWindow);
    await switchToListView(mainWindow);

    const { imageNames } = await readMixedMediaNames(mainWindow);
    expect(imageNames.length).toBeGreaterThan(0);
    await openViewerFromListRow(mainWindow, imageNames[0]);
    const direction = await selectImageBeforeVideoInViewer(mainWindow);

    await advanceUntilVideo(mainWindow, { direction: direction ?? "next", expectedPaused: false, maxSteps: 1 });
  });

  test("clicking video in viewer strip auto-plays when setting is enabled", async ({ electronApp, mainWindow }) => {
    test.skip(!hasE2eMixedMediaAssets(), mixedAssetsMissing);

    await openE2eMixedMediaLibrary(electronApp, mainWindow);
    await switchToListView(mainWindow);

    const { imageNames } = await readMixedMediaNames(mainWindow);
    expect(imageNames.length).toBeGreaterThan(0);
    await openViewerFromListRow(mainWindow, imageNames[0]);

    const videoThumb = mainWindow.locator(".media-swiper-theme .swiper-slide button video").first();
    await expect(videoThumb).toBeVisible({ timeout: 10_000 });
    await videoThumb.click({ force: true });

    await expect
      .poll(async () => currentViewerVideoPaused(mainWindow), { timeout: 10_000 })
      .toBe(false);
  });

  test("manual navigation to video does not auto-play when setting is disabled", async ({ electronApp, mainWindow }) => {
    test.skip(!hasE2eMixedMediaAssets(), mixedAssetsMissing);

    await setAutoPlayVideoOnSelection(mainWindow, false);
    await openE2eMixedMediaLibrary(electronApp, mainWindow);
    await expect
      .poll(
        async () =>
          mainWindow.evaluate(async () => {
            const settings = await window.desktopApi.getSettings();
            return settings.mediaViewer.autoPlayVideoOnOpen;
          }),
        { timeout: 15_000 },
      )
      .toBe(false);
    await switchToListView(mainWindow);

    const { imageNames } = await readMixedMediaNames(mainWindow);
    expect(imageNames.length).toBeGreaterThan(0);
    await openViewerFromListRow(mainWindow, imageNames[0]);
    const direction = await selectImageBeforeVideoInViewer(mainWindow);

    await advanceUntilVideo(mainWindow, {
      direction: direction ?? "next",
      expectedPaused: true,
      maxSteps: 1,
      timeoutPerStepMs: 25_000,
    });
  });

  test("paused video stays paused when the info panel opens", async ({ electronApp, mainWindow }) => {
    test.skip(!hasE2eMixedMediaAssets(), mixedAssetsMissing);

    await openE2eMixedMediaLibrary(electronApp, mainWindow);
    await switchToGridView(mainWindow);

    const { videoNames } = await readMixedMediaNames(mainWindow);
    expect(videoNames.length).toBeGreaterThan(0);
    await openViewerFromGridByTitle(mainWindow, videoNames[0]);

    await expect.poll(async () => currentViewerVideoPaused(mainWindow), { timeout: 10_000 }).toBe(false);

    const pausedAt = await pauseActiveCarouselVideo(mainWindow);
    expect(pausedAt.paused).toBe(true);
    expect(pausedAt.currentTime).toBeGreaterThan(0.2);

    await mainWindow.getByRole("button", { name: "Show info" }).click();
    await expect(mainWindow.getByRole("button", { name: "Close info panel" })).toBeVisible();
    await expect(mainWindow.getByText("Metadata is not available yet for this file.")).not.toBeVisible({
      timeout: 60_000,
    });

    await expect
      .poll(async () => {
        const playback = await readViewerVideoPlayback(mainWindow);
        if (!playback || playback.carouselCount < 1 || playback.infoCount !== 1) {
          return false;
        }
        return (
          playback.audible === 0 &&
          playback.carouselPaused === true &&
          playback.infoPaused === true &&
          Math.abs((playback.infoTime ?? 0) - pausedAt.currentTime) < 0.75
        );
      }, { timeout: 10_000 })
      .toBe(true);
    await expectAudibleVideosStayPaused(mainWindow, 1_500);

    await mainWindow.evaluate(async () => {
      const info = document.querySelector("video[data-emk-viewer-video='info-panel']") as HTMLVideoElement | null;
      if (!info) {
        throw new Error("Info panel video is not mounted");
      }
      await info.play();
    });
    await expect.poll(async () => readViewerVideoPlayback(mainWindow), { timeout: 10_000 }).toMatchObject({
      audible: 1,
      carouselPaused: true,
      infoPaused: false,
    });

    await mainWindow.evaluate(() => {
      const info = document.querySelector("video[data-emk-viewer-video='info-panel']") as HTMLVideoElement | null;
      info?.pause();
    });
    await expect.poll(async () => readViewerVideoPlayback(mainWindow), { timeout: 10_000 }).toMatchObject({
      audible: 0,
      carouselPaused: true,
      infoPaused: true,
    });
  });

  test("slideshow mode advances after video playback ends", async ({ electronApp, mainWindow }) => {
    test.skip(!hasE2eMixedMediaAssets(), mixedAssetsMissing);

    await openE2eMixedMediaLibrary(electronApp, mainWindow);
    await switchToListView(mainWindow);

    const { videoNames } = await readMixedMediaNames(mainWindow);
    expect(videoNames.length).toBeGreaterThan(0);
    await openViewerFromListRow(mainWindow, videoNames[0]);

    await mainWindow.getByRole("button", { name: "Play slideshow" }).click();

    await expect
      .poll(
        async () =>
          mainWindow.evaluate(() => {
            const activeVideo = document.querySelector(
              ".media-swiper-theme .swiper-slide-active video",
            ) as HTMLVideoElement | null;
            return activeVideo ? "video" : "non-video";
          }),
        { timeout: 20_000 },
      )
      .toBe("non-video");
  });

  test("slideshow started on image eventually plays a video slide", async ({ electronApp, mainWindow }) => {
    test.skip(!hasE2eMixedMediaAssets(), mixedAssetsMissing);
    test.setTimeout(300_000);

    await openE2eMixedMediaLibrary(electronApp, mainWindow);
    await switchToListView(mainWindow);

    const { imageNames } = await readMixedMediaNames(mainWindow);
    expect(imageNames.length).toBeGreaterThan(0);
    await openViewerFromListRow(mainWindow, imageNames[0]);
    const direction = await selectImageBeforeVideoInViewer(mainWindow);
    test.skip(direction !== "next", "Mixed media order cannot reach a video via forward slideshow");
    await mainWindow.getByRole("button", { name: "Play slideshow" }).click();

    await expect
      .poll(async () => currentViewerVideoPaused(mainWindow), { timeout: 240_000 })
      .toBe(false);
  });
});
