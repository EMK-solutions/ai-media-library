import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e-real",
  testMatch: ["real-video-face-detection.spec.ts"],
  /** Real ONNX face detection over the local talking-head clips. */
  timeout: 3_600_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
});
