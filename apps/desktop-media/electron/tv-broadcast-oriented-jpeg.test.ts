import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { readEmbeddedJpegThumbnailSync } from "./tv-broadcast-embedded-thumb";
import { ffmpegTransposeFilterForExifOrientation } from "./jpeg-exif-orientation";
import { buildScaleTransposeVf } from "./tv-broadcast-ffmpeg-jpeg";

describe("readEmbeddedJpegThumbnailSync", () => {
  const sample = "C:\\EMK-Media\\_BEST_EMK\\2018-09-08_09 DSC_0726.JPG";

  it("extracts IFD1 JPEG from header when fixture exists", () => {
    if (!fs.existsSync(sample)) return;
    const thumb = readEmbeddedJpegThumbnailSync(sample);
    expect(thumb).not.toBeNull();
    expect(thumb![0]).toBe(0xff);
    expect(thumb![1]).toBe(0xd8);
    expect(thumb!.length).toBeGreaterThan(1000);
  });
});

describe("ffmpeg scale+transpose vf", () => {
  it("Orientation 8 scales then transpose=2", () => {
    expect(ffmpegTransposeFilterForExifOrientation(8)).toBe("transpose=2");
    expect(buildScaleTransposeVf(320, 8)).toBe("scale='min(320,iw)':-1,transpose=2");
  });
});
