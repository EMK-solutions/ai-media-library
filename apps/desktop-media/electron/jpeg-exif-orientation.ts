import fs from "node:fs";

/**
 * EXIF Orientation → clockwise degrees to rotate the stored bitmap to upright.
 * Only handles the non-mirrored values (1, 3, 6, 8).
 */
export function clockwiseDegreesFromExifOrientation(orientation: number): 0 | 90 | 180 | 270 {
  if (orientation === 3) return 180;
  if (orientation === 6) return 90;
  if (orientation === 8) return 270;
  return 0;
}

/**
 * ffmpeg `transpose` filter chain to upright pixels for non-mirrored EXIF values.
 * Apply after scale for speed. Returns null when no transpose is needed.
 */
export function ffmpegTransposeFilterForExifOrientation(orientation: number): string | null {
  if (orientation === 6) return "transpose=1"; // 90° CW
  if (orientation === 8) return "transpose=2"; // 90° CCW (= 270° CW)
  if (orientation === 3) return "transpose=1,transpose=1"; // 180°
  return null;
}

/**
 * Read JPEG EXIF Orientation (tag 0x0112) without pulling browser EXIF stacks.
 * Returns 1–8, or null when missing/unreadable.
 */
export function readJpegExifOrientationSync(filePath: string): number | null {
  let fd: number | null = null;
  try {
    fd = fs.openSync(filePath, "r");
    const header = Buffer.alloc(256 * 1024);
    const bytesRead = fs.readSync(fd, header, 0, header.length, 0);
    return parseJpegExifOrientation(header.subarray(0, bytesRead));
  } catch {
    return null;
  } finally {
    if (fd !== null) {
      fs.closeSync(fd);
    }
  }
}

export function parseJpegExifOrientation(buf: Buffer): number | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 4 <= buf.length) {
    if (buf[offset] !== 0xff) {
      break;
    }
    const marker = buf[offset + 1];
    if (marker === undefined) break;
    // Standalone markers
    if (marker === 0xd9 || marker === 0xda) {
      break;
    }
    const size = buf.readUInt16BE(offset + 2);
    if (size < 2 || offset + 2 + size > buf.length) {
      break;
    }
    if (marker === 0xe1) {
      const app1Start = offset + 4;
      const app1End = offset + 2 + size;
      const orientation = parseExifOrientationInApp1(buf.subarray(app1Start, app1End));
      if (orientation !== null) {
        return orientation;
      }
    }
    offset += 2 + size;
  }
  return null;
}

function parseExifOrientationInApp1(app1: Buffer): number | null {
  if (app1.length < 14) return null;
  if (app1.toString("ascii", 0, 4) !== "Exif") return null;
  const tiff = 6;
  const endian = app1.toString("ascii", tiff, tiff + 2);
  const little = endian === "II";
  if (!little && endian !== "MM") return null;

  const u16 = (pos: number): number =>
    little ? app1.readUInt16LE(pos) : app1.readUInt16BE(pos);
  const u32 = (pos: number): number =>
    little ? app1.readUInt32LE(pos) : app1.readUInt32BE(pos);

  if (tiff + 8 > app1.length) return null;
  const ifd0Offset = u32(tiff + 4);
  const ifd0 = tiff + ifd0Offset;
  if (ifd0 + 2 > app1.length) return null;
  const entryCount = u16(ifd0);
  for (let i = 0; i < entryCount; i += 1) {
    const entry = ifd0 + 2 + i * 12;
    if (entry + 12 > app1.length) break;
    const tag = u16(entry);
    if (tag !== 0x0112) continue;
    const type = u16(entry + 2);
    const count = u32(entry + 4);
    if (type !== 3 || count !== 1) return null;
    const value = u16(entry + 8);
    if (value >= 1 && value <= 8) return value;
    return null;
  }
  return null;
}
