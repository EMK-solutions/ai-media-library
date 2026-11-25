export interface ParsedWhisperWord {
  startMs: number;
  endMs: number;
  text: string;
}

export interface ParsedWhisperSegment {
  startMs: number;
  endMs: number;
  text: string;
  words: ParsedWhisperWord[];
}

export interface ParsedWhisperTranscript {
  language: string | null;
  segments: ParsedWhisperSegment[];
}

interface OffsetPair {
  from?: unknown;
  to?: unknown;
}

/** Maps whisper.cpp `-ojf` JSON into millisecond segments and words. */
export function parseWhisperCliJson(raw: unknown): ParsedWhisperTranscript {
  if (!isRecord(raw)) {
    return { language: null, segments: [] };
  }
  const language = readLanguage(raw);
  const rows = Array.isArray(raw.transcription) ? raw.transcription : [];
  const segments: ParsedWhisperSegment[] = [];
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const bounds = readOffsets(row.offsets) ?? readTimestampPair(row.timestamps);
    const text = cleanText(typeof row.text === "string" ? row.text : "");
    const words = readWords(row.tokens);
    if (!bounds && !text && words.length === 0) continue;
    const startMs = bounds?.startMs ?? words[0]?.startMs ?? 0;
    const endMs = bounds?.endMs ?? words[words.length - 1]?.endMs ?? startMs;
    if (!text && words.length === 0) continue;
    if (isNonSpeechAnnotation(text)) continue;
    segments.push({
      startMs,
      endMs: Math.max(endMs, startMs),
      text: text || words.map((word) => word.text).join(" ").trim(),
      words,
    });
  }
  return { language, segments };
}

function readLanguage(raw: Record<string, unknown>): string | null {
  if (isRecord(raw.result) && typeof raw.result.language === "string" && raw.result.language.trim()) {
    return raw.result.language.trim().toLowerCase();
  }
  if (typeof raw.language === "string" && raw.language.trim()) {
    return raw.language.trim().toLowerCase();
  }
  return null;
}

function readWords(tokens: unknown): ParsedWhisperWord[] {
  if (!Array.isArray(tokens)) return [];
  const words: ParsedWhisperWord[] = [];
  for (const token of tokens) {
    if (!isRecord(token) || typeof token.text !== "string") continue;
    const text = cleanText(token.text);
    if (!text || isSpecialToken(token.text)) continue;
    const bounds = readOffsets(token.offsets) ?? readTimestampPair(token.timestamps);
    if (!bounds) continue;
    words.push({ startMs: bounds.startMs, endMs: Math.max(bounds.endMs, bounds.startMs), text });
  }
  return words;
}

function readOffsets(value: unknown): { startMs: number; endMs: number } | null {
  if (!isRecord(value)) return null;
  const pair = value as OffsetPair;
  const from = asMs(pair.from);
  const to = asMs(pair.to);
  if (from === null || to === null) return null;
  return { startMs: from, endMs: to };
}

function readTimestampPair(value: unknown): { startMs: number; endMs: number } | null {
  if (!isRecord(value)) return null;
  const from = parseTimestamp(value.from);
  const to = parseTimestamp(value.to);
  if (from === null || to === null) return null;
  return { startMs: from, endMs: to };
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})[,.](\d{1,3})$/);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const millis = Number(match[4].padEnd(3, "0"));
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis;
}

function asMs(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Whisper emits markers such as `[BLANK_AUDIO]` or `(music)` for audio without speech. */
export function isNonSpeechAnnotation(text: string): boolean {
  return /^(?:\s*(?:\[[^\]]*\]|\([^)]*\)|\*[^*]*\*)\s*)+$/.test(text);
}

function isSpecialToken(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("<|") || trimmed.startsWith("[_");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}
