import { describe, expect, it } from "vitest";
import fs from "node:fs";
import {
  clockwiseDegreesFromExifOrientation,
  ffmpegTransposeFilterForExifOrientation,
  parseJpegExifOrientation,
  readJpegExifOrientationSync,
} from "./jpeg-exif-orientation";

describe("clockwiseDegreesFromExifOrientation", () => {
  it("maps common uprighting rotations", () => {
    expect(clockwiseDegreesFromExifOrientation(1)).toBe(0);
    expect(clockwiseDegreesFromExifOrientation(3)).toBe(180);
    expect(clockwiseDegreesFromExifOrientation(6)).toBe(90);
    expect(clockwiseDegreesFromExifOrientation(8)).toBe(270);
  });
});

describe("ffmpegTransposeFilterForExifOrientation", () => {
  it("maps EXIF to ffmpeg transpose filters", () => {
    expect(ffmpegTransposeFilterForExifOrientation(1)).toBeNull();
    expect(ffmpegTransposeFilterForExifOrientation(6)).toBe("transpose=1");
    expect(ffmpegTransposeFilterForExifOrientation(8)).toBe("transpose=2");
    expect(ffmpegTransposeFilterForExifOrientation(3)).toBe("transpose=1,transpose=1");
  });
});

describe("parseJpegExifOrientation", () => {
  it("returns null for non-jpeg", () => {
    expect(parseJpegExifOrientation(Buffer.from([0x00, 0x01]))).toBeNull();
  });
});

describe("readJpegExifOrientationSync fixtures", () => {
  const samples = [
    "C:\\EMK-Media\\_BEST_EMK\\2018-09-08_09 DSC_0726.JPG",
    "C:\\EMK-Media\\_BEST_EMK\\2018-09-08_09 DSC_0809.JPG",
  ];

  it("reads Orientation=8 for known vertical Nikon captures when present", () => {
    for (const filePath of samples) {
      if (!fs.existsSync(filePath)) continue;
      expect(readJpegExifOrientationSync(filePath)).toBe(8);
      expect(clockwiseDegreesFromExifOrientation(8)).toBe(270);
    }
  });
});
