import type { FolderAiPipelineKind } from "../../shared/ipc";

export type SummaryPipelineKind = "semantic" | "face" | "photo" | "rotation" | "speech";

export interface FailedListContext {
  folderPath: string;
  pipeline: FolderAiPipelineKind;
  recursive: boolean;
  folderLabel: string;
}
