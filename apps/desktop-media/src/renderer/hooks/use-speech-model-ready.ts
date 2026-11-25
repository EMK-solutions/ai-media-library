import { useEffect, useState } from "react";
import { useDesktopStore } from "../stores/desktop-store";

/** True when speech-to-text is enabled and the local Whisper files are on disk. */
export function useSpeechModelReady(): boolean {
  const enabled = useDesktopStore((state) => state.speechAnalysisSettings.enabled);
  const recent = useDesktopStore((state) => state.pipelineRecent);
  const [hasLocalCopy, setHasLocalCopy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void window.desktopApi.getSpeechModelCacheStatus().then((status) => {
      if (!cancelled) setHasLocalCopy(status.hasLocalCopy);
    }).catch(() => {
      if (!cancelled) setHasLocalCopy(false);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, recent]);

  return enabled && hasLocalCopy;
}
