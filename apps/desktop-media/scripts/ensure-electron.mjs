/**
 * Verify the Electron binary exists for Playwright E2E (pnpm + CI runners).
 * Downloads and extracts Electron when path.txt or the platform binary is missing.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(__dirname, "..");
const electronExecutableMarkerPath = path.join(pkgRoot, "tests/e2e/.electron-executable-path");
const requireFromPkg = createRequire(path.join(pkgRoot, "package.json"));

function electronPackageRoot() {
  return path.dirname(requireFromPkg.resolve("electron/package.json"));
}

function platformExecutableName() {
  return process.platform === "win32" ? "electron.exe" : "electron";
}

function resolveElectronExecutable() {
  return requireFromPkg("electron");
}

function electronIsReady() {
  try {
    const executablePath = resolveElectronExecutable();
    return fs.existsSync(executablePath);
  } catch {
    return false;
  }
}

function resetElectronInstallArtifacts() {
  const root = electronPackageRoot();
  fs.rmSync(path.join(root, "dist"), { recursive: true, force: true });
  fs.rmSync(path.join(root, "path.txt"), { force: true });
}

async function installElectronFromArtifact() {
  const root = electronPackageRoot();
  const requireFromElectronPkg = createRequire(path.join(root, "package.json"));
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

  const distPath = path.join(root, "dist");
  fs.mkdirSync(distPath, { recursive: true });
  await extract(zipPath, { dir: distPath });
  await fs.promises.writeFile(path.join(root, "path.txt"), platformExecutableName(), "utf8");
}

async function main() {
  if (!electronIsReady()) {
    resetElectronInstallArtifacts();
    await installElectronFromArtifact();
  }

  const executablePath = resolveElectronExecutable();
  if (!fs.existsSync(executablePath)) {
    console.error(`Electron executable missing after install: ${executablePath}`);
    process.exit(1);
  }

  await fs.promises.writeFile(electronExecutableMarkerPath, `${executablePath}\n`, "utf8");
  console.log(`Electron ready: ${executablePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
