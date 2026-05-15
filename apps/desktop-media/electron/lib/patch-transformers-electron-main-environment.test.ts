import { describe, expect, it } from "vitest";
import {
  patchProcessReleaseForTransformersInElectronMain,
  type TransformersProcessPatchTarget,
} from "./patch-transformers-electron-main-environment";

function makeProc(releaseName: string, electronVersion?: string): TransformersProcessPatchTarget {
  const versions = {} as NodeJS.ProcessVersions;
  if (electronVersion !== undefined) {
    versions.electron = electronVersion;
  }
  return {
    versions,
    release: { name: releaseName },
  };
}

describe("patchProcessReleaseForTransformersInElectronMain", () => {
  it("no-ops when electron version is absent", () => {
    const proc = makeProc("electron");
    patchProcessReleaseForTransformersInElectronMain(proc);
    expect(proc.release.name).toBe("electron");
  });

  it("sets release.name to node when Electron is present", () => {
    const proc = makeProc("electron", "34.0.0");
    patchProcessReleaseForTransformersInElectronMain(proc);
    expect(proc.release.name).toBe("node");
  });

  it("does not overwrite when release is already node", () => {
    const proc = makeProc("node", "34.0.0");
    patchProcessReleaseForTransformersInElectronMain(proc);
    expect(proc.release.name).toBe("node");
  });
});
