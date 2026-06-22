/**
 * Install Electron to a stable cache dir for Playwright E2E (avoids broken node_modules/electron on CI).
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(__dirname, "..");
const electronCacheRoot = path.join(pkgRoot, ".cache", "electron-dist");
const electronExecutableMarkerPath = path.join(pkgRoot, "tests/e2e/.electron-executable-path");
const requireFromPkg = createRequire(path.join(pkgRoot, "package.json"));

function platformExecutableName() {
  return process.platform === "win32" ? "electron.exe" : "electron";
}

function cachedExecutablePath() {
  return path.join(electronCacheRoot, platformExecutableName());
}

function readMarkerExecutablePath() {
  if (!fs.existsSync(electronExecutableMarkerPath)) {
    return null;
  }
  const markerPath = fs.readFileSync(electronExecutableMarkerPath, "utf8").trim();
  return markerPath.length > 0 ? markerPath : null;
}

function electronIsReady(executablePath) {
  return fs.existsSync(executablePath);
}

async function installElectronToCache() {
  const requireFromElectronPkg = createRequire(
    path.join(path.dirname(requireFromPkg.resolve("electron/package.json")), "package.json"),
  );
  const { version } = requireFromElectronPkg("electron/package.json");
  const { downloadArtifact } = requireFromElectronPkg("@electron/get");
  const extract = requireFromElectronPkg("extract-zip");

  const zipPath = await downloadArtifact({
    version,
    artifactName: "electron",
    platform: process.platform,
    arch: process.arch,
    force: true,
  });

  fs.rmSync(electronCacheRoot, { recursive: true, force: true });
  fs.mkdirSync(electronCacheRoot, { recursive: true });
  await extract(zipPath, { dir: electronCacheRoot });
}

async function writeMarker(executablePath) {
  await fs.promises.writeFile(electronExecutableMarkerPath, `${executablePath}\n`, "utf8");
}

async function main() {
  const forceReinstall = process.env.CI === "true";
  let executablePath = forceReinstall ? cachedExecutablePath() : (readMarkerExecutablePath() ?? cachedExecutablePath());

  if (forceReinstall || !electronIsReady(executablePath)) {
    await installElectronToCache();
    executablePath = cachedExecutablePath();
  }

  if (!electronIsReady(executablePath)) {
    console.error(`Electron executable missing after install: ${executablePath}`);
    process.exit(1);
  }

  await writeMarker(executablePath);
  console.log(`Electron ready: ${executablePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
