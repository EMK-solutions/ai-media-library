import { describe, expect, it } from "vitest";
import type { BundleView, JobView, PipelineId } from "../../shared/pipeline-types";
import {
  buildPipelineQueueRightText,
  buildPipelineQueueStatsText,
  bundleTerminalStatusLabel,
  currentFileNameForJob,
  failureMessageForBundle,
} from "./pipeline-queue-progress-stats";

function jobView(overrides: {
  pipelineId: PipelineId;
  processed: number;
  total: number;
  details?: unknown;
  state?: JobView["state"];
}): JobView {
  return {
    jobId: "job-1",
    pipelineId: overrides.pipelineId,
    params: {},
    state: overrides.state ?? "running",
    error: null,
    startedAt: 1,
    finishedAt: null,
    progress: {
      phase: null,
      processed: overrides.processed,
      total: overrides.total,
      message: null,
      details: overrides.details ?? null,
      lastUpdatedAt: 1,
    },
  };
}

describe("buildPipelineQueueStatsText", () => {
  it("formats processed count with spaced ratio and hides zero skipped and failed", () => {
    expect(
      buildPipelineQueueStatsText(
        jobView({
          pipelineId: "photo-analysis",
          processed: 2,
          total: 10,
        }),
      ),
    ).toBe("Processed: 2 / 10");
  });

  it("shows skipped only when items were previously processed outside this run", () => {
    expect(
      buildPipelineQueueStatsText(
        jobView({
          pipelineId: "semantic-index",
          processed: 2,
          total: 10,
          details: { skipped: 90 },
        }),
      ),
    ).toBe("Processed: 2 / 10 | Skipped: 90");
  });

  it("shows skipped from start even when processed is zero", () => {
    expect(
      buildPipelineQueueStatsText(
        jobView({
          pipelineId: "semantic-index",
          processed: 0,
          total: 12,
          details: { skipped: 88 },
        }),
      ),
    ).toBe("Processed: 0 / 12 | Skipped: 88");
  });

  it("shows image-only face progress without a raw face-instance count", () => {
    expect(
      buildPipelineQueueStatsText(
        jobView({
          pipelineId: "face-detection",
          processed: 3,
          total: 8,
          details: {
            imageProcessed: 3,
            imageTotal: 8,
            videoProcessed: 0,
            videoTotal: 0,
            imagesWithFaces: 2,
            videosWithFaces: 0,
            totalFacesDetected: 12,
          },
        }),
      ),
    ).toBe("Processed: 3 / 8 images | Images with faces: 2");
  });

  it("shows mixed image and video face progress", () => {
    expect(
      buildPipelineQueueStatsText(
        jobView({
          pipelineId: "face-detection",
          processed: 5,
          total: 12,
          details: {
            imageProcessed: 3,
            imageTotal: 8,
            videoProcessed: 2,
            videoTotal: 4,
            imagesWithFaces: 2,
            videosWithFaces: 1,
          },
        }),
      ),
    ).toBe("Processed: 3 / 8 images and 2 / 4 videos | Images with faces: 2, Videos with faces: 1");
  });

  it("shows rotation-specific counts without adding skipped to processed", () => {
    expect(
      buildPipelineQueueStatsText(
        jobView({
          pipelineId: "image-rotation-precheck",
          processed: 4,
          total: 6,
          details: { wronglyRotated: 2, skipped: 94, failed: 1 },
        }),
      ),
    ).toBe("Processed: 4 / 6 | Wrongly rotated: 2 | Skipped: 94 | Failed: 1");
  });
});

describe("bundleTerminalStatusLabel", () => {
  it("maps terminal bundle states to dock labels", () => {
    expect(bundleTerminalStatusLabel("failed")).toBe("Failed");
    expect(bundleTerminalStatusLabel("partial")).toBe("Completed with errors");
  });
});

describe("failureMessageForBundle", () => {
  it("returns the first failed job error", () => {
    const bundle: BundleView = {
      bundleId: "b1",
      displayName: "Analyze",
      state: "failed",
      enqueuedAt: 1,
      startedAt: 1,
      finishedAt: 2,
      jobs: [
        {
          ...jobView({ pipelineId: "photo-analysis", processed: 0, total: 0, state: "failed" }),
          error: "Ollama model warmup timed out for 'qwen3.5:9c' (model not found)",
        },
      ],
    };
    expect(failureMessageForBundle(bundle)).toBe(
      "Ollama model warmup timed out for 'qwen3.5:9c' (model not found)",
    );
  });

  it("returns null when no failed job has an error message", () => {
    const bundle: BundleView = {
      bundleId: "b1",
      displayName: "Analyze",
      state: "failed",
      enqueuedAt: 1,
      startedAt: 1,
      finishedAt: 2,
      jobs: [jobView({ pipelineId: "photo-analysis", processed: 0, total: 0, state: "failed" })],
    };
    expect(failureMessageForBundle(bundle)).toBeNull();
  });
});

describe("buildPipelineQueueRightText", () => {
  it("shows the photo analysis model warmup hint until the first item is processed", () => {
    expect(
      buildPipelineQueueRightText(
        jobView({
          pipelineId: "photo-analysis",
          processed: 0,
          total: 12,
          details: { model: "llava:latest", skipped: 3 },
        }),
      ),
    ).toBe("Loading AI model llava:latest - it may take 1-2min");
  });

  it("hides the model warmup hint after processing starts", () => {
    expect(
      buildPipelineQueueRightText(
        jobView({
          pipelineId: "photo-analysis",
          processed: 1,
          total: 12,
          details: { model: "llava:latest" },
        }),
      ),
    ).toBeNull();
  });

  it("shows the speech model loading hint while the pipeline reports loadingModel", () => {
    expect(
      buildPipelineQueueRightText(
        jobView({
          pipelineId: "video-speech-to-text",
          processed: 2,
          total: 5,
          details: { loadingModel: "large-v3-turbo-q5_0", skipped: 2 },
        }),
      ),
    ).toBe("Loading speech model large-v3-turbo-q5_0 - it may take up to 1min");
    expect(
      buildPipelineQueueRightText(
        jobView({ pipelineId: "video-speech-to-text", processed: 3, total: 5, details: { skipped: 2 } }),
      ),
    ).toBeNull();
  });
});

describe("currentFileNameForJob", () => {
  it("returns the file name from a Windows or POSIX currentFile path", () => {
    expect(
      currentFileNameForJob(
        jobView({ pipelineId: "video-speech-to-text", processed: 0, total: 1, details: { currentFile: "C:\\v\\clip.mp4" } }),
      ),
    ).toBe("clip.mp4");
    expect(
      currentFileNameForJob(
        jobView({ pipelineId: "photo-analysis", processed: 0, total: 1, details: { currentFile: "/photos/a.jpg" } }),
      ),
    ).toBe("a.jpg");
  });

  it("returns null when the job is not running or has no current file", () => {
    expect(
      currentFileNameForJob(
        jobView({ pipelineId: "photo-analysis", processed: 1, total: 1, state: "succeeded", details: { currentFile: "/a.jpg" } }),
      ),
    ).toBeNull();
    expect(currentFileNameForJob(jobView({ pipelineId: "photo-analysis", processed: 0, total: 1 }))).toBeNull();
  });
});
