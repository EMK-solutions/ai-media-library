import { app } from "electron";
import { readSettings } from "../storage";

export interface FaceCoverageQueryOptions {
  minRotationConfidenceThreshold: number;
  includeVideosInFaceCoverage: boolean;
}

const DEFAULT_FACE_COVERAGE_OPTIONS: FaceCoverageQueryOptions = {
  minRotationConfidenceThreshold: 0.9,
  includeVideosInFaceCoverage: true,
};

/** Disk settings used by folder coverage / face-summary queries. */
export async function readFaceCoverageQueryOptions(): Promise<FaceCoverageQueryOptions> {
  try {
    const settings = await readSettings(app.getPath("userData"));
    return {
      minRotationConfidenceThreshold:
        settings.wrongImageRotationDetection?.minConfidenceThreshold ?? 0.9,
      includeVideosInFaceCoverage: settings.faceDetection?.detectFacesInVideoFiles ?? true,
    };
  } catch {
    return { ...DEFAULT_FACE_COVERAGE_OPTIONS };
  }
}
