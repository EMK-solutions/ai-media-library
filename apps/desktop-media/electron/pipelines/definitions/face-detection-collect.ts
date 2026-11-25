import { listFolderImages, listFolderVideos } from "../../fs-media";
import {
  getAlreadyFaceDetectedPhotoPaths,
  getFaceDetectionFailedPaths,
} from "../../db/media-analysis";
import { orderPendingPipelineItems, type PipelineImageItem } from "../../ipc/pipeline-item-order";

export interface FaceDetectionWork {
  images: PipelineImageItem[];
  videos: PipelineImageItem[];
  skippedExisting: number;
}

export async function collectFaceDetectionWork(params: {
  folders: string[];
  mode: "missing" | "all";
  skipPreviouslyFailed: boolean;
  includeVideos: boolean;
}): Promise<FaceDetectionWork> {
  const pendingImages: PipelineImageItem[] = [];
  const pendingVideos: PipelineImageItem[] = [];
  const failedImagePaths = new Set<string>();
  const failedVideoPaths = new Set<string>();
  let skippedExisting = 0;

  for (const folder of params.folders) {
    const images = await listFolderImages(folder);
    const imagePaths = images.map((image) => image.path);
    const previouslyFailedImages = getFaceDetectionFailedPaths(imagePaths);
    for (const failedPath of previouslyFailedImages) {
      failedImagePaths.add(failedPath);
    }
    if (params.mode === "missing") {
      const persistedDetected = getAlreadyFaceDetectedPhotoPaths(folder, imagePaths);
      skippedExisting += persistedDetected.size;
      for (const image of images) {
        if (persistedDetected.has(image.path)) continue;
        pendingImages.push({ path: image.path, name: image.name, folderPath: folder });
      }
    } else {
      for (const image of images) {
        pendingImages.push({ path: image.path, name: image.name, folderPath: folder });
      }
    }

    if (!params.includeVideos) {
      continue;
    }
    const videos = await listFolderVideos(folder);
    const videoPaths = videos.map((video) => video.path);
    const previouslyFailedVideos = getFaceDetectionFailedPaths(videoPaths);
    for (const failedPath of previouslyFailedVideos) {
      failedVideoPaths.add(failedPath);
    }
    if (params.mode === "missing") {
      const persistedDetected = getAlreadyFaceDetectedPhotoPaths(folder, videoPaths);
      skippedExisting += persistedDetected.size;
      for (const video of videos) {
        if (persistedDetected.has(video.path)) continue;
        pendingVideos.push({ path: video.path, name: video.name, folderPath: folder });
      }
    } else {
      for (const video of videos) {
        pendingVideos.push({ path: video.path, name: video.name, folderPath: folder });
      }
    }
  }

  return {
    images: orderPendingPipelineItems(
      pendingImages,
      failedImagePaths,
      params.skipPreviouslyFailed,
    ),
    videos: orderPendingPipelineItems(
      pendingVideos,
      failedVideoPaths,
      params.skipPreviouslyFailed,
    ),
    skippedExisting,
  };
}

export function collectFaceDetectionWorkSyncForTests(params: {
  images: PipelineImageItem[];
  videos: PipelineImageItem[];
  failedPaths: Set<string>;
  skipPreviouslyFailed: boolean;
}): { images: PipelineImageItem[]; videos: PipelineImageItem[] } {
  return {
    images: orderPendingPipelineItems(params.images, params.failedPaths, params.skipPreviouslyFailed),
    videos: orderPendingPipelineItems(params.videos, params.failedPaths, params.skipPreviouslyFailed),
  };
}
