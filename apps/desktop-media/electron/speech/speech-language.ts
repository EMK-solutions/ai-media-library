/** Spoken language passed to whisper.cpp. `auto` detects the language and transcribes in it. */
export const DEFAULT_SPEECH_LANGUAGE = "auto";

/**
 * Value stored in settings. Keeps a short letter code while it is being typed (`r` before `ru`).
 * Anything else falls back to auto-detect.
 */
export function sanitizeSpeechLanguage(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_SPEECH_LANGUAGE;
  const normalized = value.trim().toLowerCase().slice(0, 8);
  if (normalized.length === 0 || normalized === "auto") return DEFAULT_SPEECH_LANGUAGE;
  return /^[a-z]{1,3}$/.test(normalized) ? normalized : DEFAULT_SPEECH_LANGUAGE;
}

/** whisper.cpp `-l` argument. A partial code such as `r` is not a language, so it runs as auto. */
export function whisperLanguageArg(value: string): string {
  const normalized = sanitizeSpeechLanguage(value);
  if (normalized === "auto" || /^[a-z]{2,3}$/.test(normalized)) return normalized;
  return DEFAULT_SPEECH_LANGUAGE;
}
