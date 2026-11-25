import type { ReactElement } from "react";
import type { SpeechAnalysisMetadata } from "@emk/media-metadata-core";

export function DesktopSpeechInfoSection({ speech }: { speech: SpeechAnalysisMetadata | null }): ReactElement | null {
  if (!speech) return null;
  const language = speech.language ?? "unknown";
  if (!speech.text) {
    return (
      <section className="grid gap-2">
        <h3 className="m-0 text-sm font-semibold text-foreground">Speech</h3>
        <p className="m-0 text-sm text-muted-foreground">
          {speech.has_audio === false ? "No audio track." : "No speech detected."}
        </p>
      </section>
    );
  }
  return (
    <section className="grid gap-2">
      <h3 className="m-0 text-sm font-semibold text-foreground">Speech</h3>
      <p className="m-0 text-sm text-muted-foreground">Language: {language}</p>
      {typeof speech.speaker_count === "number" ? (
        <p className="m-0 text-sm text-muted-foreground">Speakers: {speech.speaker_count}</p>
      ) : null}
      <pre className="m-0 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-2 text-sm text-foreground">
        {speech.text || "No speech detected."}
      </pre>
    </section>
  );
}
