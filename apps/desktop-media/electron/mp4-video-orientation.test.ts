import { describe, expect, it } from "vitest";
import fs from "node:fs";
import {
  parseMp4VideoOrientationFromMoov,
  readMp4VideoOrientationSync,
  rotationDegreesFromDisplayMatrix,
} from "./mp4-video-orientation";

describe("rotationDegreesFromDisplayMatrix", () => {
  it("maps identity and quarter turns", () => {
    expect(rotationDegreesFromDisplayMatrix(1, 0, 0, 1)).toBe(0);
    expect(rotationDegreesFromDisplayMatrix(-1, 0, 0, -1)).toBe(180);
    expect(rotationDegreesFromDisplayMatrix(0, 1, -1, 0)).toBe(90);
    expect(rotationDegreesFromDisplayMatrix(0, -1, 1, 0)).toBe(270);
  });
});

describe("parseMp4VideoOrientationFromMoov", () => {
  function u32(n: number): Buffer {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(n);
    return b;
  }

  function box(type: string, content: Buffer): Buffer {
    return Buffer.concat([u32(8 + content.length), Buffer.from(type, "ascii"), content]);
  }

  function fixed16(n: number): Buffer {
    const b = Buffer.alloc(4);
    b.writeInt32BE(Math.round(n * 65536));
    return b;
  }

  it("reads vide track matrix rotation and coded size", () => {
    // tkhd v0: 84 bytes minimum before width/height at 76/80; matrix at 40
    const tkhd = Buffer.alloc(84, 0);
    tkhd[0] = 0; // version
    // matrix at 40: a=0 b=-1 c=1 d=0 (270°)
    fixed16(0).copy(tkhd, 40);
    fixed16(-1).copy(tkhd, 44);
    fixed16(0).copy(tkhd, 48);
    fixed16(1).copy(tkhd, 52);
    fixed16(0).copy(tkhd, 56);
    fixed16(0).copy(tkhd, 60);
    fixed16(0).copy(tkhd, 64);
    fixed16(0).copy(tkhd, 68);
    fixed16(0x40000000 / 65536).copy(tkhd, 72); // w ~ 1 in 2.30 often stored differently; irrelevant
    fixed16(1920).copy(tkhd, 76);
    fixed16(1080).copy(tkhd, 80);

    const hdlrVide = Buffer.alloc(12, 0);
    Buffer.from("vide").copy(hdlrVide, 8);

    const mdia = box("mdia", box("hdlr", hdlrVide));
    const trak = box("trak", Buffer.concat([box("tkhd", tkhd), mdia]));
    const moov = box("moov", trak);

    const parsed = parseMp4VideoOrientationFromMoov(moov);
    expect(parsed).toEqual({
      rotationDegrees: 270,
      codedWidth: 1920,
      codedHeight: 1080,
    });
  });
});

describe("readMp4VideoOrientationSync real samples", () => {
  const bad = "C:\\EMK-Media\\_BEST_EMK\\20190908_093504.mp4";
  const good = "C:\\EMK-Media\\_BEST_EMK\\YouCut_20190716_231550853.mp4";

  it("detects 270° rotation on phone capture when fixture exists", () => {
    if (!fs.existsSync(bad)) return;
    const orientation = readMp4VideoOrientationSync(bad);
    expect(orientation?.rotationDegrees).toBe(270);
    expect(orientation?.codedWidth).toBe(1920);
    expect(orientation?.codedHeight).toBe(1080);
  });

  it("detects identity rotation on re-encoded portrait when fixture exists", () => {
    if (!fs.existsSync(good)) return;
    const orientation = readMp4VideoOrientationSync(good);
    expect(orientation?.rotationDegrees).toBe(0);
    expect(orientation?.codedWidth).toBeGreaterThan(0);
    expect(orientation?.codedHeight).toBeGreaterThan(orientation?.codedWidth ?? 0);
  });
});
