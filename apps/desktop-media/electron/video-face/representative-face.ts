import { iouXyxy, type PixelXyxyBox } from "@emk/shared-contracts";

export interface RepresentativeCandidate {
  bbox_xyxy: [number, number, number, number];
  score: number;
  landmarks_5?: Array<[number, number]>;
  bboxAreaImageRatio?: number | null;
  timeMs: number;
  frameIndex: number;
  embedding?: number[];
}

export interface RepresentativePick {
  primary: RepresentativeCandidate;
  secondary: RepresentativeCandidate | null;
}

const SECONDARY_SCORE_RATIO = 0.8;
const SECONDARY_MAX_IOU = 0.45;

/**
 * Frontal-ness from RetinaFace-order 5-point landmarks
 * (left eye, right eye, nose, left mouth, right mouth).
 * Returns 0.35–1.
 */
export function frontalScoreFromLandmarks(landmarks: Array<[number, number]> | undefined): number {
  if (!Array.isArray(landmarks) || landmarks.length < 5) {
    return 0.6;
  }
  const leftEye = landmarks[0];
  const rightEye = landmarks[1];
  const nose = landmarks[2];
  if (!leftEye || !rightEye || !nose) {
    return 0.6;
  }
  const eyeDist = Math.hypot(rightEye[0] - leftEye[0], rightEye[1] - leftEye[1]);
  if (eyeDist <= 1) {
    return 0.4;
  }
  const midX = (leftEye[0] + rightEye[0]) / 2;
  const offset = Math.abs(nose[0] - midX) / eyeDist;
  const eyeYDelta = Math.abs(rightEye[1] - leftEye[1]) / eyeDist;
  const centered = Math.max(0, 1 - offset * 2);
  const level = Math.max(0, 1 - eyeYDelta * 2);
  return Math.max(0.35, Math.min(1, 0.35 + 0.65 * centered * level));
}

export function representativeQualityScore(candidate: RepresentativeCandidate): number {
  const [x1, y1, x2, y2] = candidate.bbox_xyxy;
  const area = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaRatio = candidate.bboxAreaImageRatio ?? 0;
  const sizeTerm = areaRatio > 0 ? Math.sqrt(areaRatio) : Math.sqrt(Math.max(area, 1));
  const frontal = frontalScoreFromLandmarks(candidate.landmarks_5);
  const confidence = Number.isFinite(candidate.score) ? Math.max(0, candidate.score) : 0;
  return confidence * sizeTerm * frontal;
}

function toBox(candidate: RepresentativeCandidate): PixelXyxyBox {
  const [x1, y1, x2, y2] = candidate.bbox_xyxy;
  return { x1, y1, x2, y2 };
}

/** Pick the best sample on a track, plus an optional second pose. */
export function pickRepresentativeFaces(candidates: RepresentativeCandidate[]): RepresentativePick | null {
  if (candidates.length === 0) {
    return null;
  }
  const scored = candidates.map((candidate) => ({
    candidate,
    quality: representativeQualityScore(candidate),
  }));
  scored.sort((a, b) => b.quality - a.quality);
  const primaryEntry = scored[0];
  if (!primaryEntry) {
    return null;
  }
  const primary = primaryEntry.candidate;
  let secondary: RepresentativeCandidate | null = null;
  for (let i = 1; i < scored.length; i++) {
    const entry = scored[i];
    if (!entry) continue;
    if (entry.quality < primaryEntry.quality * SECONDARY_SCORE_RATIO) {
      break;
    }
    if (iouXyxy(toBox(primary), toBox(entry.candidate)) <= SECONDARY_MAX_IOU) {
      secondary = entry.candidate;
      break;
    }
  }
  return { primary, secondary };
}
