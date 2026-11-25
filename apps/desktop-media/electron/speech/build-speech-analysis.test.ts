import { describe, expect, it } from "vitest";
import { buildSpeechAnalysis } from "./build-speech-analysis";
import { markFillerWords } from "./filler-words";
import { isNoAudioStreamError } from "./extract-speech-wav";
import { isNonSpeechAnnotation, parseWhisperCliJson } from "./parse-whisper-json";
import { silenceSpansFromSegments } from "./silence-spans";
import { STUB_WHISPER_DURATION_MS, STUB_WHISPER_JSON } from "./stub-whisper-json";

describe("parseWhisperCliJson", () => {
  it("reads language, segment times, and words", () => {
    const parsed = parseWhisperCliJson(STUB_WHISPER_JSON);
    expect(parsed.language).toBe("en");
    expect(parsed.segments).toHaveLength(2);
    expect(parsed.segments[0]?.text).toBe("hello um");
    expect(parsed.segments[0]?.words.map((word) => word.text)).toEqual(["hello", "um"]);
    expect(parsed.segments[1]?.startMs).toBe(2000);
  });

  it("returns an empty transcript for a file with no speech", () => {
    expect(parseWhisperCliJson({ result: { language: "en" }, transcription: [] })).toEqual({
      language: "en",
      segments: [],
    });
  });

  it("drops non-speech markers such as [BLANK_AUDIO] and (music)", () => {
    const parsed = parseWhisperCliJson({
      transcription: [
        { offsets: { from: 0, to: 1000 }, text: " [BLANK_AUDIO]" },
        { offsets: { from: 1000, to: 2000 }, text: " (music) [Applause]" },
        { offsets: { from: 2000, to: 3000 }, text: " hello [laughs]" },
      ],
    });
    expect(parsed.segments.map((segment) => segment.text)).toEqual(["hello [laughs]"]);
  });
});

describe("isNonSpeechAnnotation", () => {
  it("matches bracketed markers only", () => {
    expect(isNonSpeechAnnotation("[BLANK_AUDIO]")).toBe(true);
    expect(isNonSpeechAnnotation("*music*")).toBe(true);
    expect(isNonSpeechAnnotation("hello")).toBe(false);
  });
});

describe("isNoAudioStreamError", () => {
  it("recognizes ffmpeg messages for a video without an audio track", () => {
    expect(isNoAudioStreamError("Output file #0 does not contain any stream")).toBe(true);
    expect(isNoAudioStreamError("[out#0/wav] Output file does not contain any stream")).toBe(true);
  });

  it("does not treat other ffmpeg errors as missing audio", () => {
    expect(isNoAudioStreamError("Invalid data found when processing input")).toBe(false);
  });
});

describe("silenceSpansFromSegments", () => {
  it("keeps gaps at or above the minimum", () => {
    const spans = silenceSpansFromSegments(3000, [{ startMs: 0, endMs: 400 }, { startMs: 2000, endMs: 2500 }], 800);
    expect(spans).toEqual([{ start_ms: 400, end_ms: 2000 }]);
    expect(silenceSpansFromSegments(4000, [{ startMs: 0, endMs: 400 }, { startMs: 2000, endMs: 2500 }], 800)).toEqual([
      { start_ms: 400, end_ms: 2000 },
      { start_ms: 2500, end_ms: 4000 },
    ]);
  });

  it("drops gaps shorter than the minimum", () => {
    expect(silenceSpansFromSegments(3000, [{ startMs: 0, endMs: 400 }, { startMs: 2000, endMs: 2500 }], 5000)).toEqual([]);
  });
});

describe("markFillerWords", () => {
  it("marks single words and phrases", () => {
    const marked = markFillerWords(
      [{ text: "Um" }, { text: "you" }, { text: "know" }, { text: "hello" }],
      ["um", "you know"],
    );
    expect(marked.map((word) => word.filler)).toEqual([true, true, true, false]);
  });
});

describe("buildSpeechAnalysis", () => {
  const transcript = parseWhisperCliJson(STUB_WHISPER_JSON);

  it("omits words and filler flags when those options are off", () => {
    const analysis = buildSpeechAnalysis({
      transcript,
      durationMs: STUB_WHISPER_DURATION_MS,
      processedAt: "2026-11-25T00:00:00.000Z",
      includeSilenceSpans: true,
      fillerLexicon: "um, uh",
      options: { word_timestamps: false, silence_min_ms: 800, filler_detection: false },
    });
    expect(analysis.text).toBe("hello um there");
    expect(analysis.speaker_count).toBeNull();
    expect(analysis.segments[0]?.words).toBeUndefined();
    expect(analysis.silence_spans?.length).toBeGreaterThan(0);
  });

  it("stores word times and filler flags when those options are on", () => {
    const analysis = buildSpeechAnalysis({
      transcript,
      durationMs: STUB_WHISPER_DURATION_MS,
      processedAt: "2026-11-25T00:00:00.000Z",
      includeSilenceSpans: false,
      fillerLexicon: "um",
      options: { word_timestamps: true, silence_min_ms: 5000, filler_detection: true },
    });
    expect(analysis.silence_spans).toBeUndefined();
    expect(analysis.segments[0]?.words?.find((word) => word.text === "um")?.filler).toBe(true);
    expect(analysis.segments[0]?.words?.find((word) => word.text === "hello")?.filler).toBe(false);
  });

  it("marks a successful empty transcript as having no speech", () => {
    const analysis = buildSpeechAnalysis({
      transcript: { language: null, segments: [] },
      durationMs: 0,
      hasAudio: false,
      processedAt: "2026-11-25T00:00:00.000Z",
      includeSilenceSpans: true,
      fillerLexicon: "",
      options: { word_timestamps: false, silence_min_ms: 800, filler_detection: false },
    });
    expect(analysis.has_audio).toBe(false);
    expect(analysis.has_speech).toBe(false);
    expect(analysis.text).toBe("");
  });
});
