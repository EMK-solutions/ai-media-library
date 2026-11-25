import { beforeEach, describe, expect, it, vi } from "vitest";

const listFolderImages = vi.fn();
const listFolderVideos = vi.fn();
const getAlreadyFaceDetectedPhotoPaths = vi.fn();
const getFaceDetectionFailedPaths = vi.fn();

vi.mock("../../fs-media", () => ({
  listFolderImages: (...args: unknown[]) => listFolderImages(...args),
  listFolderVideos: (...args: unknown[]) => listFolderVideos(...args),
}));

vi.mock("../../db/media-analysis", () => ({
  getAlreadyFaceDetectedPhotoPaths: (...args: unknown[]) => getAlreadyFaceDetectedPhotoPaths(...args),
  getFaceDetectionFailedPaths: (...args: unknown[]) => getFaceDetectionFailedPaths(...args),
}));

import { collectFaceDetectionWork } from "./face-detection-collect";

describe("collectFaceDetectionWork", () => {
  beforeEach(() => {
    listFolderImages.mockReset();
    listFolderVideos.mockReset();
    getAlreadyFaceDetectedPhotoPaths.mockReset();
    getFaceDetectionFailedPaths.mockReset();
    getAlreadyFaceDetectedPhotoPaths.mockReturnValue(new Set());
    getFaceDetectionFailedPaths.mockReturnValue(new Set());
  });

  it("collects images from every folder before videos", async () => {
    listFolderImages.mockImplementation(async (folder: string) => {
      if (folder === "C:\\a") return [{ path: "C:\\a\\one.jpg", name: "one.jpg" }];
      return [{ path: "C:\\b\\two.jpg", name: "two.jpg" }];
    });
    listFolderVideos.mockImplementation(async (folder: string) => {
      if (folder === "C:\\a") return [{ path: "C:\\a\\clip.mp4", name: "clip.mp4" }];
      return [{ path: "C:\\b\\other.mp4", name: "other.mp4" }];
    });

    const work = await collectFaceDetectionWork({
      folders: ["C:\\a", "C:\\b"],
      mode: "missing",
      skipPreviouslyFailed: false,
      includeVideos: true,
    });

    expect(work.images.map((item) => item.path)).toEqual(["C:\\a\\one.jpg", "C:\\b\\two.jpg"]);
    expect(work.videos.map((item) => item.path)).toEqual(["C:\\a\\clip.mp4", "C:\\b\\other.mp4"]);
  });

  it("skips videos when includeVideos is off", async () => {
    listFolderImages.mockResolvedValue([{ path: "C:\\a\\one.jpg", name: "one.jpg" }]);
    listFolderVideos.mockResolvedValue([{ path: "C:\\a\\clip.mp4", name: "clip.mp4" }]);

    const work = await collectFaceDetectionWork({
      folders: ["C:\\a"],
      mode: "missing",
      skipPreviouslyFailed: false,
      includeVideos: false,
    });

    expect(work.images).toHaveLength(1);
    expect(work.videos).toHaveLength(0);
    expect(listFolderVideos).not.toHaveBeenCalled();
  });

  it("skips videos that already have face detection", async () => {
    listFolderImages.mockResolvedValue([]);
    listFolderVideos.mockResolvedValue([
      { path: "C:\\a\\done.mp4", name: "done.mp4" },
      { path: "C:\\a\\new.mp4", name: "new.mp4" },
    ]);
    getAlreadyFaceDetectedPhotoPaths.mockImplementation((_folder: string, paths: string[]) => {
      return new Set(paths.filter((filePath) => filePath.endsWith("done.mp4")));
    });

    const work = await collectFaceDetectionWork({
      folders: ["C:\\a"],
      mode: "missing",
      skipPreviouslyFailed: false,
      includeVideos: true,
    });

    expect(work.videos.map((item) => item.name)).toEqual(["new.mp4"]);
    expect(work.skippedExisting).toBe(1);
  });
});
