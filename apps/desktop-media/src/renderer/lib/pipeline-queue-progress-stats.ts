import type { BundleState, BundleView, JobView, PipelineId } from "../../shared/pipeline-types";
import { formatCount, formatCountRatio } from "./progress-stats-format";

/** Human-readable terminal bundle label for the pipeline queue dock. */
export function bundleTerminalStatusLabel(state: BundleState): string {
  switch (state) {
    case "succeeded":
      return "Completed";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "partial":
      return "Completed with errors";
    default:
      return state;
  }
}

/** First non-empty error from a failed job in the bundle (for dock failure details). */
export function failureMessageForBundle(bundle: BundleView): string | null {
  for (const job of bundle.jobs) {
    if (job.state !== "failed") continue;
    const trimmed = job.error?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

export function buildPipelineQueueStatsText(job: JobView): string {
  if (job.pipelineId === "face-detection") {
    const faceText = buildFaceDetectionStatsText(
      job.progress.details,
      job.progress.processed,
      job.progress.total,
    );
    const skipped = numberDetail(job.progress.details, "skipped");
    const failed = failedCountForJob(job);
    return `${faceText}${skipped > 0 ? ` | Skipped: ${formatCount(skipped)}` : ""}${failed > 0 ? ` | Failed: ${formatCount(failed)}` : ""}`;
  }
  const processed = job.progress.total != null
    ? formatCountRatio(job.progress.processed, job.progress.total)
    : `${formatCount(job.progress.processed)} / ?`;
  const extra = pipelineMetricText(job.pipelineId, job.progress.details);
  const skipped = numberDetail(job.progress.details, "skipped");
  const failed = failedCountForJob(job);
  return `Processed: ${processed}${extra ? ` | ${extra}` : ""}${skipped > 0 ? ` | Skipped: ${formatCount(skipped)}` : ""}${failed > 0 ? ` | Failed: ${formatCount(failed)}` : ""}`;
}

export function buildFaceDetectionStatsText(
  details: unknown,
  processed: number,
  total: number | null,
): string {
  const fallbackProcessed =
    total != null ? formatCountRatio(processed, total) : `${formatCount(processed)} / ?`;
  if (!hasDetailKey(details, "imageTotal") && !hasDetailKey(details, "videoTotal")) {
    return `Processed: ${fallbackProcessed} images`;
  }
  const imageTotal = numberDetail(details, "imageTotal");
  const videoTotal = numberDetail(details, "videoTotal");
  const imageProcessed = numberDetail(details, "imageProcessed");
  const videoProcessed = numberDetail(details, "videoProcessed");
  const imagesWithFaces = numberDetail(details, "imagesWithFaces");
  const videosWithFaces = numberDetail(details, "videosWithFaces");
  const processedClause =
    videoTotal > 0
      ? `Processed: ${formatCountRatio(imageProcessed, imageTotal)} images and ${formatCountRatio(videoProcessed, videoTotal)} videos`
      : `Processed: ${formatCountRatio(imageProcessed, imageTotal)} images`;
  const facesClause =
    videoTotal > 0
      ? `Images with faces: ${formatCount(imagesWithFaces)}, Videos with faces: ${formatCount(videosWithFaces)}`
      : `Images with faces: ${formatCount(imagesWithFaces)}`;
  return `${processedClause} | ${facesClause}`;
}

export function buildPipelineQueueRightText(job: JobView): string | null {
  if (job.state !== "running") return null;
  if (job.pipelineId === "video-speech-to-text") {
    const speechModel = stringDetail(job.progress.details, "loadingModel");
    return speechModel ? `Loading speech model ${speechModel} - it may take up to 1min` : null;
  }
  if (job.pipelineId !== "photo-analysis" || job.progress.processed > 0) {
    return null;
  }
  const model = stringDetail(job.progress.details, "model");
  if (!model) return null;
  return `Loading AI model ${model} - it may take 1-2min`;
}

/** File name of the item a running job is working on, from `details.currentFile`. */
export function currentFileNameForJob(job: JobView): string | null {
  if (job.state !== "running") return null;
  const filePath = stringDetail(job.progress.details, "currentFile");
  if (!filePath) return null;
  return filePath.split(/[/\\]/).pop() || filePath;
}

function pipelineMetricText(pipelineId: PipelineId, details: unknown): string | null {
  if (pipelineId === "image-rotation-precheck") {
    return `Wrongly rotated: ${formatCount(numberDetail(details, "wronglyRotated"))}`;
  }
  if (pipelineId === "gps-geocode") {
    return `With GPS: ${formatCount(numberDetail(details, "geoDataUpdated"))}`;
  }
  if (pipelineId === "video-speech-to-text") {
    const withoutVoice = numberDetail(details, "withoutVoice");
    return withoutVoice > 0 ? `Without voice: ${formatCount(withoutVoice)}` : null;
  }
  return null;
}

function failedCountForJob(job: JobView): number {
  const detailedFailed = numberDetail(job.progress.details, "failed");
  if (detailedFailed > 0) return detailedFailed;
  return job.state === "failed" ? 1 : 0;
}

function hasDetailKey(details: unknown, key: string): boolean {
  return typeof details === "object" && details !== null && key in details;
}

function numberDetail(details: unknown, key: string): number {
  if (typeof details !== "object" || details === null) return 0;
  const value = (details as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringDetail(details: unknown, key: string): string | null {
  if (typeof details !== "object" || details === null) return null;
  const value = (details as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
