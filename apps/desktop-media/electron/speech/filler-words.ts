export const DEFAULT_FILLER_LEXICON = ["um", "uh", "er", "ah", "hmm", "like", "you know", "i mean"] as const;

export interface FillerWord {
  text: string;
  filler?: boolean;
}

export function parseFillerLexicon(raw: string): string[] {
  const parts = raw
    .split(",")
    .map((part) => normalizeToken(part))
    .filter((part) => part.length > 0);
  return [...new Set(parts)];
}

/** Marks lexicon hits. Multi-word phrases ("you know") mark every word in the match. */
export function markFillerWords<T extends FillerWord>(words: T[], lexicon: readonly string[]): Array<T & { filler: boolean }> {
  const singles = new Set(lexicon.filter((entry) => !entry.includes(" ")));
  const phrases = lexicon.filter((entry) => entry.includes(" "));
  const normalized = words.map((word) => normalizeToken(word.text));
  const fillerIndexes = new Set<number>();
  for (let index = 0; index < normalized.length; index += 1) {
    if (singles.has(normalized[index] ?? "")) {
      fillerIndexes.add(index);
    }
  }
  for (const phrase of phrases) {
    const parts = phrase.split(" ").filter((part) => part.length > 0);
    if (parts.length < 2) continue;
    for (let index = 0; index <= normalized.length - parts.length; index += 1) {
      const matches = parts.every((part, offset) => normalized[index + offset] === part);
      if (!matches) continue;
      for (let offset = 0; offset < parts.length; offset += 1) {
        fillerIndexes.add(index + offset);
      }
    }
  }
  return words.map((word, index) =>
    fillerIndexes.has(index) ? { ...word, filler: true } : { ...word, filler: false },
  );
}

export function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
