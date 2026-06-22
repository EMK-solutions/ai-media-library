/**
 * Verify the Electron binary exists for Playwright E2E (pnpm + CI runners).
 * Re-runs electron/install.js when path.txt or dist/electron.exe is missing.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(__dirname, "..");
const requireFromPkg = createRequire(path.join(pkgRoot, "package.json"));

function electronPackageRoot() {
  return path.dirname(requireFromPkg.resolve("electron/package.json"));
}

function resetElectronInstallArtifacts() {
  const root = electronPackageRoot();
  fs.rmSync(path.join(root, "dist"), { recursive: true, force: true });
  fs.rmSync(path.join(root, "path.txt"), { force: true });
}

function runElectronInstall(force) {
  const installScript = path.join(electronPackageRoot(), "install.js");
  const env = { ...process.env };
  if (force) {
    env.force_no_cache = "true";
  }
  const result = spawnSync(process.execPath, [installScript], {
    cwd: pkgRoot,
    stdio: "inherit",
    env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
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

if (!electronIsReady()) {
  resetElectronInstallArtifacts();
  runElectronInstall(true);
}

const executablePath = resolveElectronExecutable();
if (!fs.existsSync(executablePath)) {
  console.error(`Electron executable missing after install: ${executablePath}`);
  process.exit(1);
}

console.log(`Electron ready: ${executablePath}`);
