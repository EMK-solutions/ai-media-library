import type { FaceDetectionSettings } from "../../src/shared/ipc";
import { detectFacesInPhoto } from "../face-detection";
import { embedFacesNative } from "../native-face/arcface-embedder";
import { replaceVideoFaceTracks } from "../db/video-face-tracks";
import { associateDetectionsToTracks, type FaceTrack, type TrackedSample } from "./track-faces";
import {
  pickRepresentativeFaces,
  type RepresentativeCandidate,
  type RepresentativePick,
} from "./representative-face";
import { extractVideoFaceFrames, removeExtractedVideoFrames } from "./extract-frames";
import { isVideoFaceStubbed, stubProcessVideoFileFaces } from "./stub-video-faces";

export interface ProcessVideoFacesResult {
  mediaItemId: string | null;
  trackCount: number;
  representativeFaceCount: number;
  sampleCount: number;
  hadFaces: boolean;
}

function detectionToCandidate(
  sample: TrackedSample,
  embedding?: number[],
): RepresentativeCandidate {
  return {
    bbox_xyxy: sample.detection.bbox_xyxy,
    score: sample.detection.score,
    landmarks_5: sample.detection.landmarks_5,
    bboxAreaImageRatio: sample.detection.bboxAreaImageRatio,
    timeMs: sample.timeMs,
    frameIndex: sample.frameIndex,
    embedding,
  };
}

export async function processVideoFileFaces(params: {
  sourcePath: string;
  settings: FaceDetectionSettings;
  durationSec?: number | null;
  signal?: AbortSignal;
}): Promise<ProcessVideoFacesResult> {
  if (isVideoFaceStubbed()) {
    return Promise.resolve(stubProcessVideoFileFaces(params));
  }
  const intervalSec = params.settings.videoFaceSampleIntervalSec;
  const extracted = await extractVideoFaceFrames({
    sourcePath: params.sourcePath,
    intervalSec,
    durationSec: params.durationSec,
    signal: params.signal,
  });

  let tracks: FaceTrack[] = [];
  let lastImageSize: { width: number; height: number } | null = null;
  const embeddingsByFaceKey = new Map<
    string,
    { vector: number[]; model: string; dimension: number }
  >();

  try {
    for (const frame of extracted.frames) {
      if (params.signal?.aborted) {
        throw new Error("Face detection cancelled");
      }
      const output = await detectFacesInPhoto({
        imagePath: frame.filePath,
        signal: params.signal,
        settings: params.settings,
      });
      lastImageSize = output.imageSizeForBoundingBoxes ?? lastImageSize;
      if (output.faces.length === 0) {
        continue;
      }

      let embeddings: Array<{ vector: number[] }> = [];
      try {
        const native = await embedFacesNative({
          imagePath: frame.filePath,
          faces: output.faces.map((face) => ({
            bbox_xyxy: face.bbox_xyxy,
            landmarks_5: face.landmarks_5,
          })),
          signal: params.signal,
        });
        embeddings = native.embeddings.map((row) => ({ vector: row.vector }));
        for (const row of native.embeddings) {
          embeddingsByFaceKey.set(`${frame.frameIndex}:${row.face_index}`, {
            vector: row.vector,
            model: native.modelName,
            dimension: native.dimension,
          });
        }
      } catch {
        embeddings = [];
      }

      const samples: TrackedSample[] = output.faces.map((detection, index) => ({
        frameIndex: frame.frameIndex,
        timeMs: frame.timeMs,
        detection,
        embedding: embeddings[index]?.vector,
      }));
      tracks = associateDetectionsToTracks(tracks, samples, {
        embeddingThreshold: params.settings.faceRecognitionSimilarityThreshold,
      });
    }

    const representatives: Array<{ trackIndex: number; pick: RepresentativePick }> = [];
    for (const track of tracks) {
      const candidates = track.samples.map((sample) =>
        detectionToCandidate(sample, sample.embedding),
      );
      const pick = pickRepresentativeFaces(candidates);
      if (!pick) continue;
      representatives.push({ trackIndex: track.trackIndex, pick });
      if (pick.primary.embedding) {
        embeddingsByFaceKey.set(`${track.trackIndex}:primary`, {
          vector: pick.primary.embedding,
          model: "w600k_r50",
          dimension: pick.primary.embedding.length,
        });
      }
      if (pick.secondary?.embedding) {
        embeddingsByFaceKey.set(`${track.trackIndex}:secondary`, {
          vector: pick.secondary.embedding,
          model: "w600k_r50",
          dimension: pick.secondary.embedding.length,
        });
      }
    }

    const persisted = replaceVideoFaceTracks({
      sourcePath: params.sourcePath,
      tracks,
      representatives,
      imageSize: lastImageSize,
      detectorModel: params.settings.detectorModel,
      embeddingsByFaceKey,
    });

    const representativeFaceCount = persisted?.representativeFaceCount ?? 0;
    return {
      mediaItemId: persisted?.mediaItemId ?? null,
      trackCount: tracks.length,
      representativeFaceCount,
      sampleCount: extracted.frames.length,
      hadFaces: representativeFaceCount > 0,
    };
  } finally {
    await removeExtractedVideoFrames(extracted.tempDir);
  }
}
