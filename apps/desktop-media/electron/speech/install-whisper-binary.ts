import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { downloadFile } from "./download-file";
import { binaryArchiveForPlatform, type SpeechModelFiles } from "./speech-model-paths";

const execFileAsync = promisify(execFile);

export async function installWhisperBinary(
  files: SpeechModelFiles,
  signal: AbortSignal | undefined,
  onPercent: (percent: number) => void,
): Promise<void> {
  const archivePath = path.join(files.rootDir, "whisper-cli-archive");
  const archive = binaryArchiveForPlatform();
  await downloadFile({
    url: archive.url,
    destination: archivePath,
    signal,
    onProgress: (received, total) => onPercent(downloadPercent(1, 30, received, total)),
  });
  const extractDir = path.join(files.rootDir, "whisper-cli-extract");
  await fs.promises.rm(extractDir, { recursive: true, force: true });
  await fs.promises.mkdir(extractDir, { recursive: true });
  await execFileAsync("tar", ["-xf", archivePath, "-C", extractDir]);
  const found = await findBinary(extractDir);
  if (!found) {
    throw new Error("whisper.cpp archive did not contain whisper-cli.");
  }
  await copyRuntimeFiles(path.dirname(found), path.dirname(files.binaryPath), path.basename(files.binaryPath));
  await fs.promises.rm(archivePath, { force: true });
}

/**
 * whisper.cpp's Windows build needs DLLs beside whisper-cli.exe.
 * Older downloads copied only the exe. If the extract folder is still present, copy the missing files.
 */
export async function ensureWhisperCompanionFiles(files: SpeechModelFiles): Promise<void> {
  const destDir = path.dirname(files.binaryPath);
  const extractDir = path.join(files.rootDir, "whisper-cli-extract");
  const found = await findBinary(extractDir).catch(() => null);
  if (!found) return;
  await copyRuntimeFiles(path.dirname(found), destDir, path.basename(files.binaryPath));
}

export async function listWhisperRuntimeFiles(binaryPath: string): Promise<string[]> {
  const dir = path.dirname(binaryPath);
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

export function downloadPercent(start: number, end: number, received: number, total: number | null): number {
  if (!total || total <= 0) return start;
  const ratio = Math.min(1, received / total);
  return Math.round(start + (end - start) * ratio);
}

async function copyRuntimeFiles(sourceDir: string, destDir: string, binaryName: string): Promise<void> {
  await fs.promises.mkdir(destDir, { recursive: true });
  const entries = await fs.promises.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const targetName = entry.name.toLowerCase() === "whisper-cli.exe" || entry.name.toLowerCase() === "whisper-cli"
      ? binaryName
      : entry.name;
    await fs.promises.copyFile(path.join(sourceDir, entry.name), path.join(destDir, targetName));
  }
  if (process.platform !== "win32") {
    await fs.promises.chmod(path.join(destDir, binaryName), 0o755);
  }
}

async function findBinary(dir: string): Promise<string | null> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await findBinary(full);
      if (nested) return nested;
      continue;
    }
    const lower = entry.name.toLowerCase();
    if (lower === "whisper-cli" || lower === "whisper-cli.exe" || lower === "main.exe" || lower === "main") {
      return full;
    }
  }
  return null;
}
