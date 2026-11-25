import type { FaceDetectionSettings } from "../../src/shared/ipc";
import { replaceVideoFaceTracks } from "../db/video-face-tracks";
import { pickRepresentativeFaces } from "./representative-face";
import type { FaceTrack } from "./track-faces";

export function isVideoFaceStubbed(): boolean {
  return process.env.EMK_E2E_VIDEO_FACE_STUB === "1";
}

/** Writes a catalogued face track without ffmpeg or ONNX. Paths containing `no-face-video` store no faces. */
export function stubProcessVideoFileFaces(params: {
  sourcePath: string;
  settings: FaceDetectionSettings;
}): {
  mediaItemId: string | null;
  trackCount: number;
  representativeFaceCount: number;
  sampleCount: number;
  hadFaces: boolean;
} {
  const noFace = params.sourcePath.toLowerCase().includes("no-face-video");
  const track: FaceTrack | null = noFace
    ? null
    : {
        trackIndex: 0,
        runningEmbedding: [1, 0, 0, 0],
        samples: [
          {
            frameIndex: 0,
            timeMs: 300,
            embedding: [1, 0, 0, 0],
            detection: { bbox_xyxy: [10, 10, 50, 50], score: 0.91, landmarks_5: [] },
          },
        ],
      };
  const pick = track
    ? pickRepresentativeFaces(
        track.samples.map((sample) => ({
          bbox_xyxy: sample.detection.bbox_xyxy,
          score: sample.detection.score,
          timeMs: sample.timeMs,
          frameIndex: sample.frameIndex,
          embedding: sample.embedding,
        })),
      )
    : null;
  const persisted = replaceVideoFaceTracks({
    sourcePath: params.sourcePath,
    tracks: track ? [track] : [],
    representatives: track && pick ? [{ trackIndex: track.trackIndex, pick }] : [],
    imageSize: { width: 64, height: 64 },
    detectorModel: params.settings.detectorModel,
    embeddingsByFaceKey: new Map(
      pick ? [["0:primary", { vector: [1, 0, 0, 0], model: "stub", dimension: 4 }]] : [],
    ),
  });
  const representativeFaceCount = persisted?.representativeFaceCount ?? 0;
  return {
    mediaItemId: persisted?.mediaItemId ?? null,
    trackCount: track ? 1 : 0,
    representativeFaceCount,
    sampleCount: 1,
    hadFaces: representativeFaceCount > 0,
  };
}
