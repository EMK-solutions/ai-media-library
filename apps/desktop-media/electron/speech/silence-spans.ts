export interface TimedSpan {
  startMs: number;
  endMs: number;
}

/** Gaps between speech segments, including leading and trailing silence, at or above `minMs`. */
export function silenceSpansFromSegments(
  durationMs: number,
  segments: TimedSpan[],
  minMs: number,
): Array<{ start_ms: number; end_ms: number }> {
  const duration = Math.max(0, Math.round(durationMs));
  const minGap = Math.max(0, Math.round(minMs));
  const ordered = [...segments]
    .filter((span) => Number.isFinite(span.startMs) && Number.isFinite(span.endMs) && span.endMs > span.startMs)
    .sort((a, b) => a.startMs - b.startMs);
  const spans: Array<{ start_ms: number; end_ms: number }> = [];
  let cursor = 0;
  for (const segment of ordered) {
    const start = Math.max(0, Math.min(duration, Math.round(segment.startMs)));
    const end = Math.max(start, Math.min(duration, Math.round(segment.endMs)));
    if (start - cursor >= minGap) {
      spans.push({ start_ms: cursor, end_ms: start });
    }
    cursor = Math.max(cursor, end);
  }
  if (duration - cursor >= minGap) {
    spans.push({ start_ms: cursor, end_ms: duration });
  }
  return spans;
}
