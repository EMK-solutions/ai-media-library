import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  clearTvBroadcastThumbMemoryCache,
  resolveImageOrientationFromDb,
} from "./tv-broadcast-thumbs";

vi.mock("./db/client", () => ({
  getDesktopDatabase: vi.fn(),
}));

vi.mock("./jpeg-exif-orientation", () => ({
  readJpegExifOrientationSync: vi.fn(() => null),
  clockwiseDegreesFromExifOrientation: (orientation: number) => {
    if (orientation === 3) return 180;
    if (orientation === 6) return 90;
    if (orientation === 8) return 270;
    return 0;
  },
}));

import { getDesktopDatabase } from "./db/client";
import { readJpegExifOrientationSync } from "./jpeg-exif-orientation";

describe("resolveImageOrientationFromDb", () => {
  beforeEach(() => {
    clearTvBroadcastThumbMemoryCache();
    vi.mocked(getDesktopDatabase).mockReset();
    vi.mocked(readJpegExifOrientationSync).mockReset();
    vi.mocked(readJpegExifOrientationSync).mockReturnValue(null);
  });

  it("uses DB orientation when present (skips file EXIF)", () => {
    const get = vi.fn(() => ({ orientation: 8 }));
    vi.mocked(getDesktopDatabase).mockReturnValue({
      prepare: () => ({ get }),
    } as never);
    expect(resolveImageOrientationFromDb("C:\\photos\\a.jpg")).toBe(8);
    expect(readJpegExifOrientationSync).not.toHaveBeenCalled();
  });

  it("falls back to header EXIF when DB orientation is null", () => {
    const get = vi.fn(() => ({ orientation: null }));
    vi.mocked(getDesktopDatabase).mockReturnValue({
      prepare: () => ({ get }),
    } as never);
    vi.mocked(readJpegExifOrientationSync).mockReturnValue(8);
    expect(resolveImageOrientationFromDb("C:\\photos\\a.jpg")).toBe(8);
    expect(readJpegExifOrientationSync).toHaveBeenCalledWith("C:\\photos\\a.jpg");
  });

  it("falls back to header EXIF when DB has no row", () => {
    const get = vi.fn(() => undefined);
    vi.mocked(getDesktopDatabase).mockReturnValue({
      prepare: () => ({ get }),
    } as never);
    vi.mocked(readJpegExifOrientationSync).mockReturnValue(6);
    expect(resolveImageOrientationFromDb("C:\\photos\\a.jpg")).toBe(6);
  });

  it("defaults to 1 when DB and header EXIF both miss", () => {
    const get = vi.fn(() => undefined);
    vi.mocked(getDesktopDatabase).mockReturnValue({
      prepare: () => ({ get }),
    } as never);
    vi.mocked(readJpegExifOrientationSync).mockReturnValue(null);
    expect(resolveImageOrientationFromDb("C:\\photos\\a.jpg")).toBe(1);
  });
});
