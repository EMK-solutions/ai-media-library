# Folder AI analysis dashboard — business rules

Rules for [F-08-01](README.md).

| ID | Rule | Why it exists | Defined in |
|---|---|---|---|
| BR-1 | Overview (counts), folder-scan summary, and AI/GPS coverage load on three independent requests; a slower group must not block a faster card from showing real data. | Large library roots would otherwise sit on a blank page. | `apps/desktop-media/src/renderer/components/DesktopFolderAiSummaryView.tsx` |
| BR-2 | Pending cards show a spinner, never a placeholder `0` or dash. | Avoids "everything is empty" while the query is still running. | `apps/desktop-media/src/renderer/components/folder-ai-summary/summary-card-formatters.ts` |
| BR-3 | Details-tab row data is not requested until the user first opens **Subfolders**, **Face detection** or **Geo-location**. | Summary must stay fast. | `DesktopFolderAiSummaryView.tsx` (`useFolderAiSummaryTableStream`, `useFolderFaceSummaryStream`) |
| BR-4 | Dashboard Play for search index, faces, image analysis and rotation always runs with sub-folders included and **Override existing** off (missing-only). | The dashboard is a "catch up" surface, not a reprocess tool. | `apps/desktop-media/src/renderer/hooks/use-folder-ai-summary-pipeline-actions.ts` |
| BR-5 | Opening the summary does not start an automatic folder scan. | The view is read-only until Play. | `FOLDER-ANALYTICS-MENU-UX.md` §7.3, implemented via folder-selection auto-scan skip for empty parents |
| BR-6 | Scan card is red when any immediate-tree folder with media is missing a folder-scan timestamp, or when the quick scan reports new or modified files. | Those states mean the catalog is not current. | `apps/desktop-media/src/renderer/components/folder-ai-summary/SummaryMediaCountCard.tsx` |
| BR-7 | Scan card is amber when the tree is fully covered by folder scans but the oldest `metadata_scanned_at` is older than **Mark folder scan outdated after** days (default 30). | Stale catalogs should look different from "never scanned". | Same; setting in `apps/desktop-media/src/shared/ipc.ts` |
| BR-8 | "Folders missing full scan" counts only immediate children whose own scan timestamp is missing — not a deep descendant walk. | Summary load must stay cheap. | Folder-tree scan summary IPC |
| BR-9 | If the same pipeline is already pending or running for a folder that covers this path, enqueue is rejected as `duplicate-active-job`; the dashboard Play treats that as already in the queue (no error dialog). | Two overlapping jobs on one tree would fight over the same files. | `apps/desktop-media/electron/pipelines/pipeline-scheduler.ts`, `enqueue-folder-ai-pipeline.ts` |
| BR-10 | Geo Play and folder-scan Play lock each other so both cannot be started at once from the dashboard. | Both touch catalog location/scan state. | `DesktopFolderAiSummaryView.tsx` |
| BR-11 | After a metadata scan or AI job completes for a path in this folder's tree, the open dashboard reloads. | Cards would otherwise go stale while the user watches the dock. | `apps/desktop-media/src/renderer/lib/folder-ai-summary-scan-refresh.ts` |
| BR-12 | Face extra metrics (images with faces / tagged faces) are omitted while face coverage is **not done**. | Those numbers are meaningless before detection has run. | `DesktopFolderAiSummaryDashboard.tsx` |
| BR-13 | Location details on the geo card mean reverse-geocoded catalog place fields with GPS as the source, not merely "file has coordinates". | Coordinates without a place name are a different gap. | Folder AI coverage / geo card |
