import { describe, expect, it } from "vitest";
import type { FaceDetectionBox } from "../../src/shared/ipc";
import { associateDetectionsToTracks, type FaceTrack, type TrackedSample } from "./track-faces";

function detection(bbox: [number, number, number, number], score = 0.9): FaceDetectionBox {
  return { bbox_xyxy: bbox, score, landmarks_5: [] };
}

function sample(partial: Partial<TrackedSample> & Pick<TrackedSample, "detection">): TrackedSample {
  return {
    frameIndex: partial.frameIndex ?? 0,
    timeMs: partial.timeMs ?? 0,
    embedding: partial.embedding,
    detection: partial.detection,
  };
}

describe("associateDetectionsToTracks", () => {
  it("starts a new track when there is no previous state", () => {
    const tracks = associateDetectionsToTracks([], [
      sample({ detection: detection([10, 10, 40, 40]) }),
    ]);
    expect(tracks).toHaveLength(1);
    expect(tracks[0]?.samples).toHaveLength(1);
  });

  it("extends a track when IoU is high", () => {
    const previous: FaceTrack[] = [
      {
        trackIndex: 0,
        runningEmbedding: null,
        samples: [sample({ detection: detection([10, 10, 40, 40]) })],
      },
    ];
    const next = associateDetectionsToTracks(previous, [
      sample({ frameIndex: 1, timeMs: 1000, detection: detection([12, 12, 42, 42]) }),
    ]);
    expect(next).toHaveLength(1);
    expect(next[0]?.samples).toHaveLength(2);
  });

  it("associates by embedding cosine when IoU is low but the face matches", () => {
    const embedding = [1, 0, 0, 0];
    const previous: FaceTrack[] = [
      {
        trackIndex: 0,
        runningEmbedding: embedding,
        samples: [sample({ detection: detection([0, 0, 20, 20]), embedding })],
      },
    ];
    const next = associateDetectionsToTracks(
      previous,
      [
        sample({
          frameIndex: 1,
          timeMs: 1000,
          detection: detection([80, 80, 110, 110]),
          embedding: [0.99, 0.01, 0, 0],
        }),
      ],
      { iouThreshold: 0.3, embeddingThreshold: 0.5 },
    );
    expect(next).toHaveLength(1);
    expect(next[0]?.samples).toHaveLength(2);
  });

  it("opens a new track when neither IoU nor embedding matches", () => {
    const previous: FaceTrack[] = [
      {
        trackIndex: 0,
        runningEmbedding: [1, 0, 0, 0],
        samples: [sample({ detection: detection([0, 0, 20, 20]), embedding: [1, 0, 0, 0] })],
      },
    ];
    const next = associateDetectionsToTracks(previous, [
      sample({
        frameIndex: 1,
        detection: detection([80, 80, 110, 110]),
        embedding: [0, 1, 0, 0],
      }),
    ]);
    expect(next).toHaveLength(2);
  });
});
