import { greedyMatchBoxesByIou, iouXyxy, type PixelXyxyBox } from "@emk/shared-contracts";
import type { FaceDetectionBox } from "../../src/shared/ipc";

export interface TrackedSample {
  frameIndex: number;
  timeMs: number;
  detection: FaceDetectionBox;
  embedding?: number[];
}

export interface FaceTrack {
  trackIndex: number;
  samples: TrackedSample[];
  runningEmbedding: number[] | null;
}

const DEFAULT_IOU_THRESHOLD = 0.3;

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}

function meanEmbedding(current: number[] | null, next: number[] | undefined): number[] | null {
  if (!next || next.length === 0) {
    return current;
  }
  if (!current || current.length !== next.length) {
    return [...next];
  }
  return current.map((value, i) => (value + (next[i] ?? 0)) / 2);
}

function boxOf(detection: FaceDetectionBox): PixelXyxyBox {
  const [x1, y1, x2, y2] = detection.bbox_xyxy;
  return { x1, y1, x2, y2 };
}

/**
 * Online association across consecutive sampled frames: IoU first, then
 * embedding cosine when IoU fails (cuts / large motion).
 */
export function associateDetectionsToTracks(
  previous: FaceTrack[],
  detections: TrackedSample[],
  options: {
    iouThreshold?: number;
    embeddingThreshold?: number;
  } = {},
): FaceTrack[] {
  const iouThreshold = options.iouThreshold ?? DEFAULT_IOU_THRESHOLD;
  const embeddingThreshold = options.embeddingThreshold ?? 0.38;
  const tracks = previous.map((track) => ({
    ...track,
    samples: [...track.samples],
  }));

  if (detections.length === 0) {
    return tracks;
  }

  if (tracks.length === 0) {
    return detections.map((sample, index) => ({
      trackIndex: index,
      samples: [sample],
      runningEmbedding: sample.embedding ? [...sample.embedding] : null,
    }));
  }

  const lastBoxes = tracks.map((track) => {
    const last = track.samples[track.samples.length - 1]!;
    return { item: last, box: boxOf(last.detection) };
  });
  const newBoxes = detections.map((sample) => ({
    item: sample,
    box: boxOf(sample.detection),
  }));

  const iouMatches = greedyMatchBoxesByIou(newBoxes, lastBoxes, iouThreshold);
  const usedTrack = new Set<number>();
  const usedDetection = new Set<number>();

  for (const [newIndex, match] of iouMatches) {
    const sample = detections[newIndex];
    const track = tracks[match.oldIndex];
    if (!sample || !track) continue;
    track.samples.push(sample);
    track.runningEmbedding = meanEmbedding(track.runningEmbedding, sample.embedding);
    usedTrack.add(match.oldIndex);
    usedDetection.add(newIndex);
  }

  for (let newIndex = 0; newIndex < detections.length; newIndex++) {
    if (usedDetection.has(newIndex)) continue;
    const sample = detections[newIndex];
    if (!sample?.embedding) continue;
    let bestTrack = -1;
    let bestSim = embeddingThreshold;
    for (let t = 0; t < tracks.length; t++) {
      if (usedTrack.has(t)) continue;
      const track = tracks[t];
      if (!track?.runningEmbedding) continue;
      const sim = cosineSimilarity(track.runningEmbedding, sample.embedding);
      if (sim > bestSim) {
        bestSim = sim;
        bestTrack = t;
      }
    }
    if (bestTrack >= 0) {
      const track = tracks[bestTrack]!;
      track.samples.push(sample);
      track.runningEmbedding = meanEmbedding(track.runningEmbedding, sample.embedding);
      usedTrack.add(bestTrack);
      usedDetection.add(newIndex);
    }
  }

  for (let newIndex = 0; newIndex < detections.length; newIndex++) {
    if (usedDetection.has(newIndex)) continue;
    const sample = detections[newIndex];
    if (!sample) continue;
    tracks.push({
      trackIndex: tracks.length,
      samples: [sample],
      runningEmbedding: sample.embedding ? [...sample.embedding] : null,
    });
  }

  return tracks.map((track, index) => ({ ...track, trackIndex: index }));
}

export { iouXyxy };
