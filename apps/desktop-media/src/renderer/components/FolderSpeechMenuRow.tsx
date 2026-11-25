import { useState, type ReactElement } from "react";
import { ChevronRight, Play } from "lucide-react";
import { enqueueFolderAiPipeline } from "../lib/enqueue-folder-ai-pipeline";
import { cn } from "../lib/cn";
import { useSpeechModelReady } from "../hooks/use-speech-model-ready";
import { useDesktopStore } from "../stores/desktop-store";

const playBtnClass =
  "inline-flex items-center gap-1 rounded-md border border-border bg-transparent px-1.5 py-1 text-muted-foreground shadow-none transition-colors duration-150 hover:border-indigo-500 hover:bg-[#1e2a40] disabled:cursor-not-allowed disabled:opacity-40";

export function FolderSpeechMenuRow({
  targetFolderPath,
  onDismiss,
}: {
  targetFolderPath: string | null;
  onDismiss?: () => void;
}): ReactElement {
  const speechReady = useSpeechModelReady();
  const speechSettings = useDesktopStore((state) => state.speechAnalysisSettings);
  const [open, setOpen] = useState(false);
  const [includeSubfolders, setIncludeSubfolders] = useState(true);
  const [overrideExisting, setOverrideExisting] = useState(false);
  const disabled = !targetFolderPath || !speechReady;

  return (
    <>
      <div className="box-border flex min-h-[34px] w-full items-center justify-between gap-2 py-2 pl-2.5 pr-0 text-left text-sm leading-snug">
        <button type="button" className="inline-flex flex-1 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left font-inherit text-inherit shadow-none" onClick={() => setOpen((value) => !value)}>
          <ChevronRight size={14} className={cn("shrink-0 transition-transform", open && "rotate-90")} aria-hidden="true" />
          Video speech to text
        </button>
        <button
          type="button"
          className={playBtnClass}
          disabled={disabled}
          title={speechReady ? "Start video speech to text" : "Turn on Video speech to text in Settings and wait for the model"}
          aria-label="Start video speech to text"
          onClick={() => {
            if (!targetFolderPath || !speechReady) return;
            void enqueueFolderAiPipeline({
              folderPath: targetFolderPath,
              pipeline: "speech",
              recursive: includeSubfolders,
              overrideExisting,
              speechSettings,
            });
            onDismiss?.();
          }}
        >
          <Play size={14} aria-hidden="true" />
        </button>
      </div>
      {open ? (
        <div className="ml-3 grid gap-1.5 border-l border-border pl-3 text-[13px] text-muted-foreground">
          <label className="flex min-h-8 items-center justify-between gap-2">
            <span>Include sub-folders</span>
            <input type="checkbox" className="h-4 w-4" checked={includeSubfolders} onChange={(event) => setIncludeSubfolders(event.target.checked)} />
          </label>
          <label className="flex min-h-8 items-center justify-between gap-2">
            <span>Override existing</span>
            <input type="checkbox" className="h-4 w-4" checked={overrideExisting} onChange={(event) => setOverrideExisting(event.target.checked)} />
          </label>
        </div>
      ) : null}
    </>
  );
}
