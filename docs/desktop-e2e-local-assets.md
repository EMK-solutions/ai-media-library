# Desktop E2E test assets

Desktop Playwright tests use fixture assets under:

`apps/desktop-media/test-assets/e2e-photos/`

Related fixture folders:

- `apps/desktop-media/test-assets/e2e-media-mixed/`
- `apps/desktop-media/test-assets/rotation-crop/`

Speech-to-text clips live in `apps/desktop-media/test-assets/e2e-speech-videos/`. That folder is gitignored, including `expectations.json`. CI does not use it. The local Playwright config `playwright.real-speech.config.ts` (`pnpm --filter @emk/desktop-media test:e2e-real-speech`) skips when the folder or a named clip is missing. Optional override: `EMK_E2E_SPEECH_VIDEOS_DIR`. `media-2.mp4` under `e2e-media-mixed/` is a player fixture, not a speech sample.

`playwright.real-video-face.config.ts` (`pnpm --filter @emk/desktop-media test:e2e-real-video-face`) uses only the first two of those clips and expects one visible person in each: `Human role in AI-driven world v01.mp4` and `Игорь - с 50летием.mp4`. `No-to-war-in-Ukraine.mp4` is not part of the face test. The spec skips when either clip is missing, and it is not in the CI smoke list. It reuses the app's installed face models when `APPDATA\AI Media Library` is present (`EMK_E2E_REAL_FACE_RUNTIME_ROOT` overrides that).

These fixtures are now tracked in the repository so CI can run E2E suites consistently.

## Optional override

Set `EMK_E2E_PHOTOS_DIR` to an absolute path if you want to run tests against a different local asset folder.

## Replacing fixtures

When replacing fixtures, keep each test contract in sync:

1. Update required filenames in relevant E2E specs (`REQUIRED_FILES`, `REQUIRED_FILTER_FILES`, etc.).
2. Update filename-based mappings in `tests/e2e/fixtures/mock-ollama.ts` when quick-filter expectations depend on category mapping.
3. Keep `apps/desktop-media/test-assets/e2e-photos/expectations.json` aligned for unconfirmed-face and semantic expectations.
4. After changing files under `rotation-crop/`, update `rotation-crop/expectations.json` `file` entries to match (see `media01.jpg` … `media07.jpg`).
5. Re-run `pnpm test:e2e` (or CI smoke subset) to confirm no regressions.

## Troubleshooting (semantic / vision indexing)

If E2E or local runs fail with Transformers.js / ONNX errors such as **“Protobuf parsing failed”** when loading a `model.onnx` under `nomic-ai`, the Hugging Face model cache under `@huggingface/transformers` may be corrupted. Delete the **`nomic-ai`** (or the specific model) folder inside that package’s **`.cache`** directory under `node_modules`, then re-run the test so models download again.
