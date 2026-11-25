import { describe, expect, it } from "vitest";
import {
  frontalScoreFromLandmarks,
  pickRepresentativeFaces,
  representativeQualityScore,
  type RepresentativeCandidate,
} from "./representative-face";

function candidate(partial: Partial<RepresentativeCandidate> & Pick<RepresentativeCandidate, "bbox_xyxy">): RepresentativeCandidate {
  return {
    score: partial.score ?? 0.9,
    landmarks_5: partial.landmarks_5,
    bboxAreaImageRatio: partial.bboxAreaImageRatio ?? 0.04,
    timeMs: partial.timeMs ?? 0,
    frameIndex: partial.frameIndex ?? 0,
    bbox_xyxy: partial.bbox_xyxy,
  };
}

describe("representativeQualityScore", () => {
  it("scores a frontal high-confidence face above a profile or tiny one", () => {
    const frontal = candidate({
      bbox_xyxy: [10, 10, 110, 110],
      bboxAreaImageRatio: 0.2,
      score: 0.95,
      landmarks_5: [
        [40, 40],
        [80, 40],
        [60, 60],
        [45, 80],
        [75, 80],
      ],
    });
    const profile = candidate({
      bbox_xyxy: [10, 10, 110, 110],
      bboxAreaImageRatio: 0.2,
      score: 0.95,
      landmarks_5: [
        [20, 40],
        [50, 42],
        [80, 60],
        [25, 80],
        [55, 82],
      ],
    });
    expect(representativeQualityScore(frontal)).toBeGreaterThan(representativeQualityScore(profile));
    expect(frontalScoreFromLandmarks(frontal.landmarks_5)).toBeGreaterThan(
      frontalScoreFromLandmarks(profile.landmarks_5),
    );
  });
});

describe("pickRepresentativeFaces", () => {
  it("picks the highest-scoring sample as primary", () => {
    const pick = pickRepresentativeFaces([
      candidate({ bbox_xyxy: [0, 0, 10, 10], score: 0.4, bboxAreaImageRatio: 0.01, frameIndex: 0 }),
      candidate({ bbox_xyxy: [0, 0, 80, 80], score: 0.9, bboxAreaImageRatio: 0.2, frameIndex: 1 }),
    ]);
    expect(pick?.primary.frameIndex).toBe(1);
    expect(pick?.secondary).toBeNull();
  });

  it("adds a second pose when it is strong and IoU is low", () => {
    const pick = pickRepresentativeFaces([
      candidate({ bbox_xyxy: [0, 0, 40, 40], score: 0.95, bboxAreaImageRatio: 0.2, frameIndex: 0 }),
      candidate({ bbox_xyxy: [80, 80, 120, 120], score: 0.9, bboxAreaImageRatio: 0.2, frameIndex: 1 }),
    ]);
    expect(pick?.primary.frameIndex).toBe(0);
    expect(pick?.secondary?.frameIndex).toBe(1);
  });
});
