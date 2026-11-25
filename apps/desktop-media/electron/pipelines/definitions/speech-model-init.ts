import { app } from "electron";
import { resolveModelsPath } from "../../app-paths";
import { ensureSpeechModel } from "../../speech/ensure-speech-model";
import { speechModelFilesIn } from "../../speech/speech-model-paths";
import type { PipelineDefinition } from "../pipeline-registry";

export interface SpeechModelInitParams {
  forceRefresh?: boolean;
}

export interface SpeechModelInitOutput {
  ready: boolean;
}

function validateParams(params: unknown):
  | { ok: true; value: SpeechModelInitParams }
  | { ok: false; issues: string } {
  if (params !== undefined && (typeof params !== "object" || params === null)) {
    return { ok: false, issues: "params must be an object" };
  }
  const candidate = (params ?? {}) as Record<string, unknown>;
  return { ok: true, value: { forceRefresh: candidate.forceRefresh === true } };
}

export const speechModelInitDefinition: PipelineDefinition<SpeechModelInitParams, SpeechModelInitOutput> = {
  id: "speech-model-init",
  displayName: "Video speech model",
  concurrencyGroup: "io",
  validateParams,
  run: async (ctx, params) => {
    const files = speechModelFilesIn(resolveModelsPath(app));
    await ensureSpeechModel({
      files,
      forceRefresh: params.forceRefresh === true,
      signal: ctx.signal,
      onProgress: (progress) => {
        ctx.report({
          type: "phase-changed",
          phase: progress.phase,
          processed: progress.percent,
          total: 100,
          message: progress.message,
        });
      },
    });
    return { ready: true };
  },
};
