import { app } from "electron";
import type { PipelineDefinition } from "../pipeline-registry";
import type { FaceDetectionOutput } from "../../../src/shared/ipc";
import {
  collectFoldersRecursivelyWithProgress,
  ensureCatalogForImagesWithProgress,
  ensureMetadataForImage,
} from "../../ipc/folder-utils";
import {
  getOrientationDetectionStateByPath,
  markFaceDetectionFailed,
  upsertFaceDetectionResult,
} from "../../db/media-analysis";
import { getFacesNeedingEmbeddings } from "../../db/face-embeddings";
import { DEFAULT_LIBRARY_ID } from "../../db/folder-analysis-status";
import { readSettings } from "../../storage";
import { runWrongImageRotationPrecheck } from "../../orientation-preprocess";
import { detectFacesUsingOrientationState } from "../../ipc/face-detection-handlers";
import { appendSyncOperation } from "../../db/sync-log";
import { ensureFaceDetectionServiceRunning } from "../../face-service";
import {
  embedFacesForMediaItem,
  ensureFaceEmbeddingModelLoaded,
} from "../../face-embed-for-media-item";
import { embedFaceEmbeddingJobsByImage } from "../../face-embedding-batch";
import { refreshPersonSuggestionsAfterEmbeddings } from "../../face-embedding-suggestions-sync";
import { processVideoFileFaces } from "../../video-face/process-video";
import { isVideoFaceStubbed } from "../../video-face/stub-video-faces";
import { getVideoDurationSecForPath } from "../../db/video-face-tracks";
import { collectFaceDetectionWork } from "./face-detection-collect";
import type { PipelineImageItem } from "../../ipc/pipeline-item-order";

export interface FaceDetectionParams {
  folderPath: string;
  recursive?: boolean;
  mode?: "missing" | "all";
  skipPreviouslyFailed?: boolean;
  includeVideos?: boolean;
  videoSampleIntervalSec?: number;
}

export interface FaceDetectionOutputSummary {
  total: number;
  completed: number;
  failed: number;
  cancelled: number;
  mediaItemIdsWithFaces: string[];
  totalFacesDetected: number;
  embeddedFaces: number;
  failedFaceEmbeddings: number;
  cancelledFaceEmbeddings: number;
  catchUpEmbeddedFaces: number;
  catchUpFailedFaceEmbeddings: number;
}

function validateParams(params: unknown):
  | { ok: true; value: FaceDetectionParams }
  | { ok: false; issues: string } {
  if (typeof params !== "object" || params === null) {
    return { ok: false, issues: "params must be an object" };
  }
  const candidate = params as Record<string, unknown>;
  const folderPath = typeof candidate.folderPath === "string" ? candidate.folderPath.trim() : "";
  if (!folderPath) {
    return { ok: false, issues: "folderPath is required" };
  }
  const mode = candidate.mode === "all" ? "all" : "missing";
  return {
    ok: true,
    value: {
      folderPath,
      recursive: candidate.recursive === true,
      mode,
      skipPreviouslyFailed: candidate.skipPreviouslyFailed === true,
      includeVideos: typeof candidate.includeVideos === "boolean" ? candidate.includeVideos : undefined,
      videoSampleIntervalSec:
        typeof candidate.videoSampleIntervalSec === "number" && Number.isFinite(candidate.videoSampleIntervalSec)
          ? candidate.videoSampleIntervalSec
          : undefined,
    },
  };
}

function faceProgressDetails(input: {
  skipped: number;
  imageProcessed: number;
  imageTotal: number;
  videoProcessed: number;
  videoTotal: number;
  imagesWithFaces: number;
  videosWithFaces: number;
  totalFacesDetected: number;
  path?: string;
  error?: string;
  mediaId?: string | null;
  failed?: number;
  currentFile?: string;
}): Record<string, unknown> {
  return { ...input };
}

export const faceDetectionDefinition: PipelineDefinition<
  FaceDetectionParams,
  FaceDetectionOutputSummary
> = {
  id: "face-detection",
  displayName: "Detect faces",
  concurrencyGroup: "gpu",
  validateParams: (params) => validateParams(params),
  run: async (ctx, params) => {
    const folders = params.recursive
      ? await collectFoldersRecursivelyWithProgress(params.folderPath)
      : [params.folderPath];
    const appSettings = await readSettings(app.getPath("userData"));
    const faceSettings = {
      ...appSettings.faceDetection,
      videoFaceSampleIntervalSec:
        params.videoSampleIntervalSec ?? appSettings.faceDetection.videoFaceSampleIntervalSec,
    };
    const includeVideos = params.includeVideos ?? faceSettings.detectFacesInVideoFiles;
    const work = await collectFaceDetectionWork({
      folders,
      mode: params.mode ?? "missing",
      skipPreviouslyFailed: params.skipPreviouslyFailed === true,
      includeVideos,
    });
    const selectedImages = work.images;
    const selectedVideos = work.videos;
    const jobTotal = selectedImages.length + selectedVideos.length;
    await ensureCatalogForImagesWithProgress([
      ...selectedImages.map((item) => item.path),
      ...selectedVideos.map((item) => item.path),
    ]);

    const videoOnlyStub = isVideoFaceStubbed() && selectedImages.length === 0;
    if (jobTotal > 0 && !videoOnlyStub) {
      const serviceReady = await ensureFaceDetectionServiceRunning();
      if (!serviceReady) {
        throw new Error("Face detection service is unavailable. Ensure ONNX models are downloaded.");
      }
      await ensureFaceEmbeddingModelLoaded();
    }

    let completed = 0;
    let failed = 0;
    let cancelled = 0;
    let totalFacesDetected = 0;
    let embeddedFaces = 0;
    let failedFaceEmbeddings = 0;
    let cancelledFaceEmbeddings = 0;
    let catchUpEmbeddedFaces = 0;
    let catchUpFailedFaceEmbeddings = 0;
    let imagesWithFaces = 0;
    let videosWithFaces = 0;
    const mediaItemIdsWithFaces: string[] = [];

    const reportProgress = (
      processed: number,
      imageProcessed: number,
      videoProcessed: number,
      extra: { path?: string; error?: string; mediaId?: string | null; message: string; currentFile?: string },
    ): void => {
      ctx.report({
        type: "item-updated",
        processed,
        total: jobTotal,
        message: extra.message,
        details: faceProgressDetails({
          skipped: work.skippedExisting,
          imageProcessed,
          imageTotal: selectedImages.length,
          videoProcessed,
          videoTotal: selectedVideos.length,
          imagesWithFaces,
          videosWithFaces,
          totalFacesDetected,
          path: extra.path,
          error: extra.error,
          mediaId: extra.mediaId,
          failed,
          currentFile: extra.currentFile ?? extra.path,
        }),
      });
    };

    ctx.report({
      type: "started",
      total: jobTotal,
      message: `Face detection over ${selectedImages.length} images and ${selectedVideos.length} videos`,
      details: faceProgressDetails({
        skipped: work.skippedExisting,
        imageProcessed: 0,
        imageTotal: selectedImages.length,
        videoProcessed: 0,
        videoTotal: selectedVideos.length,
        imagesWithFaces: 0,
        videosWithFaces: 0,
        totalFacesDetected: 0,
      }),
    });
    ctx.report({
      type: "phase-changed",
      phase: "images",
      processed: 0,
      total: jobTotal,
      message: `Detecting faces in ${selectedImages.length} images`,
    });

    const processImage = async (image: PipelineImageItem, index: number): Promise<void> => {
      await ensureMetadataForImage(image.path);
      await runWrongImageRotationPrecheck({
        imagePath: image.path,
        settings: appSettings,
        signal: ctx.signal,
      });
      const orientationState = getOrientationDetectionStateByPath(image.path);
      const detection = await detectFacesUsingOrientationState({
        imagePath: image.path,
        signal: ctx.signal,
        settings: faceSettings,
        orientationAngleClockwise: orientationState?.correctionAngleClockwise,
        enableRotationFallback: false,
      });
      const result: FaceDetectionOutput = detection.faces;
      totalFacesDetected += result.faceCount;
      const mediaId = upsertFaceDetectionResult(
        image.path,
        result,
        undefined,
        faceSettings,
        orientationState
          ? {
              correctionAngleClockwise: orientationState.correctionAngleClockwise,
              confidence: orientationState.confidence ?? 0,
              model: faceSettings.imageOrientationDetection.model,
            }
          : null,
      );
      if (mediaId) {
        appendSyncOperation({
          mediaId,
          operationType: "media.ai.annotate",
          payload: {
            analysisType: "face_detection",
            faceCount: result.faceCount,
            sourcePath: image.path,
            completedAt: new Date().toISOString(),
          },
        });
        if (result.faceCount > 0) {
          imagesWithFaces += 1;
          mediaItemIdsWithFaces.push(mediaId);
          const embeddingSummary = await embedFacesForMediaItem({
            mediaItemId: mediaId,
            imagePath: image.path,
            signal: ctx.signal,
            preferredRotationClockwise: orientationState?.correctionAngleClockwise,
            embeddingOverride: detection.embeddingOverride,
            requireLoadedModel: true,
          });
          embeddedFaces += embeddingSummary.embedded;
          failedFaceEmbeddings += embeddingSummary.failed;
          cancelledFaceEmbeddings += embeddingSummary.cancelled;
        }
      }
      completed += 1;
      reportProgress(index + 1, index + 1, 0, {
        path: image.path,
        mediaId: mediaId ?? null,
        message: `Detected ${result.faceCount} face(s): ${image.name}`,
      });
    };

    for (let i = 0; i < selectedImages.length; i++) {
      if (ctx.signal.aborted) {
        cancelled += selectedImages.length - i + selectedVideos.length;
        break;
      }
      const image = selectedImages[i]!;
      reportProgress(i, i, 0, { currentFile: image.path, message: `Detecting faces: ${image.name}` });
      try {
        await processImage(image, i);
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : "Unknown face detection error";
        markFaceDetectionFailed(image.path, message);
        reportProgress(i + 1, i + 1, 0, {
          path: image.path,
          error: message,
          message: `Failed: ${image.name}`,
        });
      }
    }

    if (!ctx.signal.aborted && selectedVideos.length > 0) {
      ctx.report({
        type: "phase-changed",
        phase: "videos",
        processed: selectedImages.length,
        total: jobTotal,
        message: `Detecting faces in ${selectedVideos.length} videos`,
      });
      for (let i = 0; i < selectedVideos.length; i++) {
        if (ctx.signal.aborted) {
          cancelled += selectedVideos.length - i;
          break;
        }
        const video = selectedVideos[i]!;
        const processed = selectedImages.length + i + 1;
        reportProgress(processed - 1, selectedImages.length, i, {
          currentFile: video.path,
          message: `Detecting faces: ${video.name}`,
        });
        try {
          await ensureMetadataForImage(video.path);
          const videoResult = await processVideoFileFaces({
            sourcePath: video.path,
            settings: faceSettings,
            durationSec: getVideoDurationSecForPath(video.path),
            signal: ctx.signal,
          });
          totalFacesDetected += videoResult.representativeFaceCount;
          embeddedFaces += videoResult.representativeFaceCount;
          if (videoResult.hadFaces) {
            videosWithFaces += 1;
            if (videoResult.mediaItemId) {
              mediaItemIdsWithFaces.push(videoResult.mediaItemId);
            }
          }
          completed += 1;
          reportProgress(processed, selectedImages.length, i + 1, {
            path: video.path,
            mediaId: videoResult.mediaItemId,
            message: `Detected ${videoResult.trackCount} face track(s): ${video.name}`,
          });
        } catch (error) {
          failed += 1;
          const message = error instanceof Error ? error.message : "Unknown face detection error";
          markFaceDetectionFailed(video.path, message);
          reportProgress(processed, selectedImages.length, i + 1, {
            path: video.path,
            error: message,
            message: `Failed: ${video.name}`,
          });
        }
      }
    }

    if (!ctx.signal.aborted) {
      const catchUpFaces = getFacesNeedingEmbeddings(DEFAULT_LIBRARY_ID);
      if (catchUpFaces.length > 0) {
        await ensureFaceEmbeddingModelLoaded();
        const catchUpResult = await embedFaceEmbeddingJobsByImage(catchUpFaces, ctx.signal);
        catchUpEmbeddedFaces = catchUpResult.embedded;
        catchUpFailedFaceEmbeddings = catchUpResult.failed;
        cancelledFaceEmbeddings += catchUpResult.cancelled;
      }
    }

    const totalEmbedded = embeddedFaces + catchUpEmbeddedFaces;
    if (!ctx.signal.aborted && totalEmbedded > 0) {
      try {
        await refreshPersonSuggestionsAfterEmbeddings();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[face-detection] person suggestion refresh failed: ${message}`);
      }
    }

    return {
      total: jobTotal,
      completed,
      failed,
      cancelled,
      mediaItemIdsWithFaces,
      totalFacesDetected,
      embeddedFaces,
      failedFaceEmbeddings,
      cancelledFaceEmbeddings,
      catchUpEmbeddedFaces,
      catchUpFailedFaceEmbeddings,
    };
  },
};
