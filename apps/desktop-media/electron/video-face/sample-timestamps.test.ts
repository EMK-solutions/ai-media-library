import { describe, expect, it } from "vitest";
import { planVideoFaceSamples, VIDEO_FACE_MAX_SAMPLES, VIDEO_FACE_SKIP_START_SEC } from "./sample-timestamps";

describe("planVideoFaceSamples", () => {
  it("starts after the skip window and steps by the interval", () => {
    const plan = planVideoFaceSamples({ durationSec: 5, intervalSec: 1 });
    expect(plan.timestampsSec[0]).toBe(VIDEO_FACE_SKIP_START_SEC);
    expect(plan.timestampsSec).toEqual([0.3, 1.3, 2.3, 3.3, 4.3]);
    expect(plan.effectiveIntervalSec).toBe(1);
  });

  it("subsamples uniformly when the naive count would exceed the cap", () => {
    const plan = planVideoFaceSamples({
      durationSec: 7200,
      intervalSec: 1,
      maxSamples: VIDEO_FACE_MAX_SAMPLES,
    });
    expect(plan.timestampsSec.length).toBeLessThanOrEqual(VIDEO_FACE_MAX_SAMPLES);
    expect(plan.effectiveIntervalSec).toBeGreaterThan(1);
    expect(plan.timestampsSec[0]).toBe(VIDEO_FACE_SKIP_START_SEC);
  });

  it("returns a single fallback timestamp for a clip shorter than the skip window", () => {
    const plan = planVideoFaceSamples({ durationSec: 0.2, intervalSec: 1 });
    expect(plan.timestampsSec).toHaveLength(1);
    expect(plan.timestampsSec[0]).toBeLessThanOrEqual(0.2);
  });
});
