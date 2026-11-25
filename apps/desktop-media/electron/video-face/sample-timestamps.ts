export const VIDEO_FACE_SKIP_START_SEC = 0.3;
export const VIDEO_FACE_MAX_SAMPLES = 600;

export interface VideoFaceSamplePlan {
  timestampsSec: number[];
  /** ffmpeg fps filter value (1 / effective interval). */
  fps: number;
  effectiveIntervalSec: number;
}

/**
 * Time-based sample plan: start after a short skip, step by `intervalSec`,
 * and uniformly subsample when the clip would exceed `maxSamples`.
 */
export function planVideoFaceSamples(params: {
  durationSec: number;
  intervalSec: number;
  skipStartSec?: number;
  maxSamples?: number;
}): VideoFaceSamplePlan {
  const skipStartSec = Math.max(0, params.skipStartSec ?? VIDEO_FACE_SKIP_START_SEC);
  const maxSamples = Math.max(1, Math.floor(params.maxSamples ?? VIDEO_FACE_MAX_SAMPLES));
  const intervalSec = Math.max(0.05, params.intervalSec);
  const durationSec = Math.max(0, params.durationSec);

  if (!Number.isFinite(durationSec) || durationSec <= skipStartSec) {
    const fallback = Math.min(skipStartSec, Math.max(0, durationSec * 0.5));
    return {
      timestampsSec: durationSec > 0 ? [fallback] : [],
      fps: 1 / intervalSec,
      effectiveIntervalSec: intervalSec,
    };
  }

  const usable = durationSec - skipStartSec;
  const naiveCount = Math.floor(usable / intervalSec) + 1;
  const effectiveIntervalSec =
    naiveCount > maxSamples ? usable / Math.max(1, maxSamples - 1) : intervalSec;

  const timestampsSec: number[] = [];
  for (let t = skipStartSec; t < durationSec && timestampsSec.length < maxSamples; t += effectiveIntervalSec) {
    timestampsSec.push(Number(t.toFixed(3)));
  }
  if (timestampsSec.length === 0) {
    timestampsSec.push(skipStartSec);
  }

  return {
    timestampsSec,
    fps: 1 / effectiveIntervalSec,
    effectiveIntervalSec,
  };
}
