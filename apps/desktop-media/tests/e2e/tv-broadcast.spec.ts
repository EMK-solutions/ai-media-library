import { test, expect } from "./fixtures/app-fixture";
import { openE2ePhotoLibrary } from "./fixtures/e2e-photos-library";

const TV_SETTINGS_TITLE = "Broadcast album to TV";

test.describe("TV broadcast", () => {
  test("settings section exposes enable toggle and port field", async ({ mainWindow }) => {
    await mainWindow.getByRole("navigation").getByText("Settings", { exact: true }).click();
    const settingsArea = mainWindow.locator("main.main-panel");
    await expect(settingsArea).toBeVisible();
    await settingsArea.getByText(TV_SETTINGS_TITLE, { exact: true }).click();
    await expect(settingsArea.getByText("Enable TV broadcast")).toBeVisible();
    await expect(settingsArea.getByText("Request 4-digit PIN code on TV")).toBeVisible();
    await expect(settingsArea.getByText("Broadcast port")).toBeVisible();
  });

  test("TV toolbar icon starts and stops broadcast with PIN gate on HTTP", async ({
    electronApp,
    mainWindow,
  }) => {
    await openE2ePhotoLibrary(electronApp, mainWindow);

    const tvButton = mainWindow.getByTestId("desktop-tv-broadcast-trigger");
    await expect(tvButton).toBeVisible({ timeout: 15_000 });
    await tvButton.click();

    await expect(mainWindow.getByRole("heading", { name: "Broadcast folder to TV" })).toBeVisible();
    await mainWindow.getByRole("button", { name: "Start broadcast" }).click();

    const urlEl = mainWindow.getByTestId("tv-broadcast-url");
    const pinEl = mainWindow.getByTestId("tv-broadcast-pin");
    await expect(urlEl).toBeVisible({ timeout: 15_000 });
    await expect(pinEl).toBeVisible();

    const url = (await urlEl.textContent())?.trim() ?? "";
    const pin = (await pinEl.textContent())?.trim() ?? "";
    expect(url).toMatch(/^http:\/\//);
    expect(pin).toMatch(/^\d{4}$/);

    const homePage = await mainWindow.request.get(url);
    expect(homePage.status()).toBe(200);
    const homeHtml = await homePage.text();
    expect(homeHtml).toContain("Broadcast PIN");
    expect(homeHtml).toContain("Open album");

    await mainWindow.getByRole("button", { name: "Got it" }).click();
    await expect(tvButton).toHaveAttribute("aria-pressed", "true");

    const unauthorized = await mainWindow.request.get(new URL("/api/playlist", url).toString());
    expect(unauthorized.status()).toBe(401);

    const auth = await mainWindow.request.post(new URL("/api/auth", url).toString(), {
      data: { pin },
    });
    expect(auth.status()).toBe(200);
    const setCookie = auth.headers()["set-cookie"] ?? "";
    expect(setCookie).toContain("emk_tv_session=");

    const playlist = await mainWindow.request.get(new URL("/api/playlist", url).toString(), {
      headers: { Cookie: setCookie.split(";")[0] ?? "" },
    });
    expect(playlist.status()).toBe(200);
    const body = (await playlist.json()) as { items: unknown[] };
    expect(body.items.length).toBeGreaterThan(0);

    await tvButton.click();
    await expect(mainWindow.getByRole("heading", { name: "Stop TV broadcast?" })).toBeVisible();
    await mainWindow.getByRole("button", { name: "Stop broadcast" }).click();
    await expect(tvButton).toHaveAttribute("aria-pressed", "false");
  });

  test("disabling TV broadcast in settings hides toolbar icon", async ({
    electronApp,
    mainWindow,
  }) => {
    await openE2ePhotoLibrary(electronApp, mainWindow);
    await expect(mainWindow.getByTestId("desktop-tv-broadcast-trigger")).toBeVisible({
      timeout: 15_000,
    });

    await mainWindow.getByRole("navigation").getByText("Settings", { exact: true }).click();
    const settingsArea = mainWindow.locator("main.main-panel");
    await settingsArea.getByText(TV_SETTINGS_TITLE, { exact: true }).click();
    await settingsArea.getByRole("checkbox", { name: /Enable TV broadcast/i }).click();

    await mainWindow.getByRole("navigation").getByText("Folders", { exact: true }).click();
    await expect(mainWindow.getByTestId("desktop-tv-broadcast-trigger")).toHaveCount(0);
  });
});
