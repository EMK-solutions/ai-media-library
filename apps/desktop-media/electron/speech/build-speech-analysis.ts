import type { SpeechAnalysisMetadata, SpeechAnalysisOptions, SpeechAnalysisWord } from "@emk/media-metadata-core";
import { markFillerWords, parseFillerLexicon } from "./filler-words";
import type { ParsedWhisperTranscript, ParsedWhisperWord } from "./parse-whisper-json";
import { silenceSpansFromSegments } from "./silence-spans";

export const SPEECH_MODEL_ID = "large-v3-turbo-q5_0";

export function buildSpeechAnalysis(input: {
  transcript: ParsedWhisperTranscript;
  durationMs: number;
  hasAudio?: boolean;
  processedAt: string;
  options: SpeechAnalysisOptions;
  includeSilenceSpans: boolean;
  fillerLexicon: string;
}): SpeechAnalysisMetadata {
  const includeWords = input.options.word_timestamps || input.options.filler_detection;
  const lexicon = parseFillerLexicon(input.fillerLexicon);
  const segments = input.transcript.segments.map((segment) => {
    const words = includeWords ? toStoredWords(segment.words, input.options, lexicon) : undefined;
    return {
      start_ms: segment.startMs,
      end_ms: segment.endMs,
      text: segment.text,
      speaker_id: null,
      ...(words ? { words } : {}),
    };
  });
  const text = segments
    .map((segment) => segment.text.trim())
    .filter((segment) => segment.length > 0)
    .join(" ")
    .trim();
  const silence = silenceSpansFromSegments(
    input.durationMs,
    segments.map((segment) => ({ startMs: segment.start_ms, endMs: segment.end_ms })),
    input.options.silence_min_ms,
  );
  return {
    processed_at: input.processedAt,
    engine: "whisper.cpp",
    model: SPEECH_MODEL_ID,
    language: input.transcript.language,
    duration_ms: Math.max(0, Math.round(input.durationMs)),
    has_audio: input.hasAudio !== false,
    has_speech: text.length > 0,
    text,
    speaker_count: null,
    speakers: null,
    segments,
    ...(input.includeSilenceSpans ? { silence_spans: silence } : {}),
    options: input.options,
  };
}

function toStoredWords(
  words: ParsedWhisperWord[],
  options: SpeechAnalysisOptions,
  lexicon: string[],
): SpeechAnalysisWord[] {
  if (!options.filler_detection) {
    return words.map((word) => ({
      start_ms: word.startMs,
      end_ms: word.endMs,
      text: word.text,
    }));
  }
  return markFillerWords(words, lexicon).map((word) => ({
    start_ms: word.startMs,
    end_ms: word.endMs,
    text: word.text,
    filler: word.filler === true,
  }));
}
