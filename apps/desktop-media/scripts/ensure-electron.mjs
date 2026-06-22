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

function findElectronExecutable(searchRoot) {
  function walk(dir) {
    const direct = path.join(dir, platformExecutableName());
    if (fs.existsSync(direct)) {
      return direct;
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      const nested = walk(path.join(dir, entry.name));
      if (nested) {
        return nested;
      }
    }
    return null;
  }

  const found = walk(searchRoot);
  if (!found) {
    throw new Error(`Could not find ${platformExecutableName()} under ${searchRoot}`);
  }
  return found;
}

function readMarkerExecutablePath() {
  if (!fs.existsSync(electronExecutableMarkerPath)) {
    return null;
  }
  const markerPath = fs.readFileSync(electronExecutableMarkerPath, "utf8").trim();
  return markerPath.length > 0 ? markerPath : null;
}

function electronIsReady(executablePath) {
  return Boolean(executablePath) && fs.existsSync(executablePath);
}

function exportForCi(executablePath) {
  if (process.env.GITHUB_ENV) {
    fs.appendFileSync(process.env.GITHUB_ENV, `EMK_E2E_ELECTRON_EXECUTABLE=${executablePath}\n`);
  }
}

async function installElectronToCache() {
  const requireFromElectronPkg = createRequire(
    path.join(path.dirname(requireFromPkg.resolve("electron/package.json")), "package.json"),
  );
  const { version } = requireFromElectronPkg("electron/package.json");
  const { downloadArtifact } = requireFromElectronPkg("@electron/get");
  const extract = requireFromElectronPkg("extract-zip");

  console.log(`Downloading Electron ${version} for ${process.platform}-${process.arch}...`);
  const zipPath = await downloadArtifact({
    version,
    artifactName: "electron",
    platform: process.platform,
    arch: process.arch,
    force: true,
  });

  fs.rmSync(electronCacheRoot, { recursive: true, force: true });
  fs.mkdirSync(electronCacheRoot, { recursive: true });
  console.log(`Extracting ${zipPath} to ${electronCacheRoot}...`);
  await extract(zipPath, { dir: electronCacheRoot });
  try {
    return findElectronExecutable(electronCacheRoot);
  } catch (error) {
    const listing = fs.existsSync(electronCacheRoot)
      ? fs.readdirSync(electronCacheRoot, { recursive: true }).map(String)
      : [];
    console.error(`Electron cache listing: ${listing.join(", ") || "(empty)"}`);
    throw error;
  }
}

function writeMarker(executablePath) {
  fs.mkdirSync(path.dirname(electronExecutableMarkerPath), { recursive: true });
  fs.writeFileSync(electronExecutableMarkerPath, `${executablePath}\n`, "utf8");
}

async function main() {
  const forceReinstall =
    process.env.FORCE_ELECTRON_INSTALL === "1" ||
    process.env.CI === "true" ||
    process.env.GITHUB_ACTIONS === "true";

  console.log(
    `ensure-electron: forceReinstall=${forceReinstall} CI=${process.env.CI ?? ""} GITHUB_ACTIONS=${process.env.GITHUB_ACTIONS ?? ""}`,
  );

  let executablePath = forceReinstall ? null : readMarkerExecutablePath();
  if (!electronIsReady(executablePath)) {
    try {
      executablePath = findElectronExecutable(electronCacheRoot);
    } catch {
      executablePath = null;
    }
  }

  if (forceReinstall || !electronIsReady(executablePath)) {
    executablePath = await installElectronToCache();
  }

  if (!electronIsReady(executablePath)) {
    console.error(`Electron executable missing after install: ${executablePath ?? "(unset)"}`);
    process.exit(1);
  }

  writeMarker(executablePath);
  exportForCi(executablePath);
  console.log(`Electron ready: ${executablePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
