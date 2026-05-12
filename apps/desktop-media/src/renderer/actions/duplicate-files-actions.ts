import type { EnqueueBundleResponse } from "../../shared/pipeline-ipc";

function rejectionMessage(result: EnqueueBundleResponse): string {
  if (result.ok) return "";
  const rejection = result.rejection;
  switch (rejection.kind) {
    case "validation-failed":
      return rejection.issues;
    case "unknown-pipeline":
      return `Unknown pipeline: ${rejection.pipelineId}`;
    case "duplicate-active-job":
      return rejection.reason;
    case "invalid-binding":
      return rejection.reason;
    default:
      return "Could not enqueue duplicate scan.";
  }
}

/**
 * Enqueues the folder duplicate-file scan pipeline (progress appears in Background operations).
 */
export async function enqueueFolderDuplicateScan(options: {
  folderPath: string;
  recursive?: boolean;
}): Promise<{ ok: true; bundleId: string } | { ok: false; error: string }> {
  const folderPath = options.folderPath.trim();
  if (!folderPath) {
    return { ok: false, error: "Folder path is required." };
  }
  const recursive = options.recursive !== false;

  const result = await window.desktopApi.pipelines.enqueueBundle({
    kind: "single-job",
    payload: {
      pipelineId: "folder-duplicate-scan",
      displayName: `Check duplicate files — ${folderPath}`,
      params: { folderPath, recursive },
    },
  });

  if (!result.ok) {
    return { ok: false, error: rejectionMessage(result) };
  }

  return { ok: true, bundleId: result.bundleId };
}
