import fs from "node:fs";
import fsPromises from "node:fs/promises";

export type QuarterTurnDegrees = 0 | 90 | 180 | 270;

export interface Mp4VideoOrientation {
  /** Clockwise display rotation from the track matrix (0 if identity). */
  rotationDegrees: QuarterTurnDegrees;
  /** Storage / coded frame width from tkhd (before rotation). */
  codedWidth: number;
  /** Storage / coded frame height from tkhd (before rotation). */
  codedHeight: number;
}

const MOOV_SEARCH_TAIL_BYTES = 12 * 1024 * 1024;
const MOOV_SEARCH_CHUNK = 2 * 1024 * 1024;

function normalizeQuarterTurn(degrees: number): QuarterTurnDegrees {
  const normalized = ((Math.round(degrees / 90) * 90) % 360 + 360) % 360;
  if (normalized === 90 || normalized === 180 || normalized === 270) {
    return normalized;
  }
  return 0;
}

/**
 * QuickTime/MP4 display matrix → clockwise degrees.
 * Matrix layout: a b u / c d v / x y w (16.16 fixed, w often 2.30).
 */
export function rotationDegreesFromDisplayMatrix(
  a: number,
  b: number,
  c: number,
  d: number,
): QuarterTurnDegrees {
  if (Math.abs(a - 1) < 0.1 && Math.abs(d - 1) < 0.1 && Math.abs(b) < 0.1 && Math.abs(c) < 0.1) {
    return 0;
  }
  if (Math.abs(a + 1) < 0.1 && Math.abs(d + 1) < 0.1 && Math.abs(b) < 0.1 && Math.abs(c) < 0.1) {
    return 180;
  }
  if (Math.abs(a) < 0.1 && Math.abs(d) < 0.1) {
    if (b > 0.9 && c < -0.9) return 90;
    if (b < -0.9 && c > 0.9) return 270;
  }
  return normalizeQuarterTurn((Math.atan2(b, a) * 180) / Math.PI);
}

function readFixed16_16(buf: Buffer, offset: number): number {
  return buf.readInt32BE(offset) / 65536;
}

function walkBoxes(
  buf: Buffer,
  start: number,
  end: number,
  onBox: (type: string, contentStart: number, contentEnd: number) => void,
): void {
  let offset = start;
  while (offset + 8 <= end) {
    let size = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    let header = 8;
    if (size === 1) {
      if (offset + 16 > end) break;
      size = Number(buf.readBigUInt64BE(offset + 8));
      header = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (!Number.isFinite(size) || size < header || offset + size > end) {
      break;
    }
    const contentStart = offset + header;
    const contentEnd = offset + size;
    onBox(type, contentStart, contentEnd);
    if (
      type === "moov" ||
      type === "trak" ||
      type === "mdia" ||
      type === "minf" ||
      type === "stbl" ||
      type === "edts"
    ) {
      walkBoxes(buf, contentStart, contentEnd, onBox);
    }
    offset = contentEnd;
  }
}

export function parseMp4VideoOrientationFromMoov(moov: Buffer): Mp4VideoOrientation | null {
  let videoOrientation: Mp4VideoOrientation | null = null;
  let pendingTkhd: { rotationDegrees: QuarterTurnDegrees; codedWidth: number; codedHeight: number } | null =
    null;

  walkBoxes(moov, 0, moov.length, (type, contentStart, contentEnd) => {
    if (type === "tkhd") {
      if (contentEnd - contentStart < 84) {
        pendingTkhd = null;
        return;
      }
      const version = moov[contentStart] ?? 0;
      const matrixOffset = contentStart + (version === 1 ? 88 : 40);
      const widthOffset = contentStart + (version === 1 ? 96 : 76);
      const heightOffset = contentStart + (version === 1 ? 100 : 80);
      if (heightOffset + 4 > contentEnd || matrixOffset + 36 > contentEnd) {
        pendingTkhd = null;
        return;
      }
      const a = readFixed16_16(moov, matrixOffset);
      const b = readFixed16_16(moov, matrixOffset + 4);
      const c = readFixed16_16(moov, matrixOffset + 12);
      const d = readFixed16_16(moov, matrixOffset + 16);
      const codedWidth = Math.round(readFixed16_16(moov, widthOffset));
      const codedHeight = Math.round(readFixed16_16(moov, heightOffset));
      pendingTkhd = {
        rotationDegrees: rotationDegreesFromDisplayMatrix(a, b, c, d),
        codedWidth,
        codedHeight,
      };
      return;
    }

    if (type === "hdlr" && pendingTkhd) {
      const handler =
        contentStart + 12 <= contentEnd
          ? moov.toString("ascii", contentStart + 8, contentStart + 12)
          : "";
      if (handler === "vide" && pendingTkhd.codedWidth > 0 && pendingTkhd.codedHeight > 0) {
        videoOrientation = pendingTkhd;
      }
      pendingTkhd = null;
    }
  });

  return videoOrientation;
}

function findMoovOffset(fd: number, fileSize: number): { offset: number; size: number } | null {
  const searchStart = Math.max(0, fileSize - MOOV_SEARCH_TAIL_BYTES);
  const chunk = Buffer.alloc(MOOV_SEARCH_CHUNK);
  let pos = searchStart;

  while (pos < fileSize) {
    const toRead = Math.min(chunk.length, fileSize - pos);
    const bytesRead = fs.readSync(fd, chunk, 0, toRead, pos);
    for (let i = 4; i <= bytesRead - 4; i += 1) {
      if (
        chunk[i] === 0x6d &&
        chunk[i + 1] === 0x6f &&
        chunk[i + 2] === 0x6f &&
        chunk[i + 3] === 0x76
      ) {
        const size = chunk.readUInt32BE(i - 4);
        const offset = pos + i - 4;
        if (size === 1) {
          // 64-bit extended size — read from file
          const ext = Buffer.alloc(8);
          fs.readSync(fd, ext, 0, 8, offset + 8);
          return { offset, size: Number(ext.readBigUInt64BE(0)) };
        }
        if (size > 8 && offset + size <= fileSize) {
          return { offset, size };
        }
      }
    }
    pos += Math.max(1, bytesRead - 7);
  }

  // Some files keep moov near the start (fast-start).
  if (searchStart > 0) {
    pos = 0;
    const headLimit = Math.min(fileSize, MOOV_SEARCH_CHUNK);
    const bytesRead = fs.readSync(fd, chunk, 0, headLimit, 0);
    for (let i = 4; i <= bytesRead - 4; i += 1) {
      if (
        chunk[i] === 0x6d &&
        chunk[i + 1] === 0x6f &&
        chunk[i + 2] === 0x6f &&
        chunk[i + 3] === 0x76
      ) {
        const size = chunk.readUInt32BE(i - 4);
        const offset = i - 4;
        if (size > 8 && offset + size <= fileSize) {
          return { offset, size };
        }
      }
    }
  }

  return null;
}

export function readMp4VideoOrientationSync(filePath: string): Mp4VideoOrientation | null {
  let fd: number | null = null;
  try {
    fd = fs.openSync(filePath, "r");
    const fileSize = fs.fstatSync(fd).size;
    if (fileSize < 16) return null;
    const moov = findMoovOffset(fd, fileSize);
    if (!moov) return null;
    const headerSize = moov.size > 0xffffffff ? 16 : 8;
    // Cap pathological moov sizes.
    const readSize = Math.min(moov.size, 16 * 1024 * 1024);
    const buf = Buffer.alloc(readSize);
    fs.readSync(fd, buf, 0, readSize, moov.offset);
    // parse from start of moov box (includes size/type) so walkBoxes sees children
    return parseMp4VideoOrientationFromMoov(buf);
  } catch {
    return null;
  } finally {
    if (fd !== null) {
      fs.closeSync(fd);
    }
  }
}

export async function readMp4VideoOrientation(filePath: string): Promise<Mp4VideoOrientation | null> {
  try {
    await fsPromises.access(filePath);
  } catch {
    return null;
  }
  return readMp4VideoOrientationSync(filePath);
}
