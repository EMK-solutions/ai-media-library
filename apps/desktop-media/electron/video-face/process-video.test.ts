import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FaceDetectionSettings } from "../../src/shared/ipc";
import { DEFAULT_FACE_DETECTION_SETTINGS } from "../../src/shared/ipc";

const detectFacesInPhoto = vi.fn();
const embedFacesNative = vi.fn();
const replaceVideoFaceTracks = vi.fn();
const extractVideoFaceFrames = vi.fn();
const removeExtractedVideoFrames = vi.fn();

vi.mock("../face-detection", () => ({
  detectFacesInPhoto: (...args: unknown[]) => detectFacesInPhoto(...args),
}));

vi.mock("../native-face/arcface-embedder", () => ({
  embedFacesNative: (...args: unknown[]) => embedFacesNative(...args),
}));

vi.mock("../db/video-face-tracks", () => ({
  replaceVideoFaceTracks: (...args: unknown[]) => replaceVideoFaceTracks(...args),
}));

vi.mock("./extract-frames", () => ({
  extractVideoFaceFrames: (...args: unknown[]) => extractVideoFaceFrames(...args),
  removeExtractedVideoFrames: (...args: unknown[]) => removeExtractedVideoFrames(...args),
}));

import { processVideoFileFaces } from "./process-video";

const settings = {
  ...DEFAULT_FACE_DETECTION_SETTINGS,
  videoFaceSampleIntervalSec: 1,
} as FaceDetectionSettings;

function face(x: number) {
  return {
    bbox_xyxy: [x, 10, x + 30, 40] as [number, number, number, number],
    score: 0.9,
    landmarks_5: [] as Array<[number, number]>,
  };
}

describe("processVideoFileFaces", () => {
  beforeEach(() => {
    detectFacesInPhoto.mockReset();
    embedFacesNative.mockReset();
    replaceVideoFaceTracks.mockReset();
    extractVideoFaceFrames.mockReset();
    removeExtractedVideoFrames.mockReset();
    extractVideoFaceFrames.mockResolvedValue({
      tempDir: "C:\\tmp\\frames",
      durationSec: 2,
      frames: [
        { filePath: "C:\\tmp\\frames\\0.jpg", frameIndex: 0, timeMs: 300 },
        { filePath: "C:\\tmp\\frames\\1.jpg", frameIndex: 1, timeMs: 1300 },
      ],
    });
    embedFacesNative.mockResolvedValue({
      modelName: "w600k_r50",
      dimension: 4,
      embeddings: [{ face_index: 0, vector: [1, 0, 0, 0] }],
    });
    replaceVideoFaceTracks.mockReturnValue({
      mediaItemId: "media-1",
      trackCount: 1,
      representativeFaceCount: 1,
      faceInstanceIds: ["face-1"],
    });
    detectFacesInPhoto.mockImplementation(async (input: { imagePath: string }) => ({
      imageSizeForBoundingBoxes: { width: 100, height: 100 },
      faces: [face(input.imagePath.endsWith("1.jpg") ? 12 : 10)],
    }));
  });

  it("tracks one face across frames and stores a representative", async () => {
    const result = await processVideoFileFaces({ sourcePath: "C:\\clips\\a.mp4", settings });
    expect(result).toMatchObject({
      mediaItemId: "media-1",
      trackCount: 1,
      representativeFaceCount: 1,
      hadFaces: true,
    });
    const stored = replaceVideoFaceTracks.mock.calls[0]?.[0] as {
      tracks: Array<{ samples: unknown[] }>;
      representatives: unknown[];
    };
    expect(stored.tracks).toHaveLength(1);
    expect(stored.tracks[0]?.samples).toHaveLength(2);
    expect(stored.representatives).toHaveLength(1);
    expect(removeExtractedVideoFrames).toHaveBeenCalledWith("C:\\tmp\\frames");
  });

  it("stores a successful empty result when no frame has a face", async () => {
    detectFacesInPhoto.mockResolvedValue({ imageSizeForBoundingBoxes: { width: 100, height: 100 }, faces: [] });
    replaceVideoFaceTracks.mockReturnValue({
      mediaItemId: "media-1",
      trackCount: 0,
      representativeFaceCount: 0,
      faceInstanceIds: [],
    });
    const result = await processVideoFileFaces({ sourcePath: "C:\\clips\\silent.mp4", settings });
    expect(result.hadFaces).toBe(false);
    expect(result.trackCount).toBe(0);
    const stored = replaceVideoFaceTracks.mock.calls[0]?.[0] as { tracks: unknown[] };
    expect(stored.tracks).toEqual([]);
  });

  it("still deletes extracted frames when detection fails", async () => {
    detectFacesInPhoto.mockRejectedValue(new Error("detector failed"));
    await expect(processVideoFileFaces({ sourcePath: "C:\\clips\\a.mp4", settings })).rejects.toThrow("detector failed");
    expect(removeExtractedVideoFrames).toHaveBeenCalledWith("C:\\tmp\\frames");
    expect(replaceVideoFaceTracks).not.toHaveBeenCalled();
  });
});
