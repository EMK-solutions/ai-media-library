import fs from "node:fs";
import ExifReader from "exifreader";

/**
 * Embedded JPEG thumbnail from EXIF IFD1 — header only (≤256KB), not a full decode.
 */
export function readEmbeddedJpegThumbnailSync(filePath: string): Buffer | null {
  let fd: number | null = null;
  try {
    fd = fs.openSync(filePath, "r");
    const header = Buffer.alloc(256 * 1024);
    const bytesRead = fs.readSync(fd, header, 0, header.length, 0);
    const tags = ExifReader.load(header.subarray(0, bytesRead), { expanded: true });
    const image = tags.Thumbnail?.image;
    if (!image) return null;
    const buf = Buffer.from(image);
    return buf.length > 0 && buf[0] === 0xff && buf[1] === 0xd8 ? buf : null;
  } catch {
    return null;
  } finally {
    if (fd !== null) {
      fs.closeSync(fd);
    }
  }
}
