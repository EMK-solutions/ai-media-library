import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e-real",
  testMatch: ["real-speech-to-text.spec.ts"],
  /** Real Whisper download plus CPU transcription of the local speech clips. */
  timeout: 3_600_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
});
