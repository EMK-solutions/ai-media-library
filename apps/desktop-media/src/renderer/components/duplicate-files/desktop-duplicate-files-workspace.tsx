import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { ArrowLeft, Info, Trash2 } from "lucide-react";
import type { FolderDuplicateScanResultPayload, FolderDuplicateScanRow } from "../../../shared/ipc";
import { PeoplePaginationBar } from "../people-pagination-bar";
import { ALBUM_ITEMS_PAGE_SIZE } from "../DesktopAlbumDetailPanel";
import { cn } from "../../lib/cn";
import {
  formatComparablePathForDisplay,
  inferPathDisplayStyle,
} from "../../lib/duplicate-files-display-paths";
import { comparableFilePath } from "../../lib/media-metadata-lookup";
import { useDesktopStore } from "../../stores/desktop-store";
import {
  buildDuplicateFolderSummaries,
  rowMatchesFolderFilter,
  splitDuplicateFolderSummariesBySelectionDiskTree,
} from "../../lib/duplicate-files-folder-aggregate";
import { normalizedScanRoot, parentFolderPath } from "../../lib/duplicate-files-folder-scope";
import {
  countScopedFilesWithDuplicateInsideDiskTree,
  countScopedFilesWithDuplicateOutsideDiskTree,
  totalByteSizeOfDuplicatesInsideDiskTree,
  totalByteSizeOfDuplicatesOutsideDiskTree,
} from "../../lib/duplicate-files-outside-selection-stats";
import { DuplicateFilesByFolderPanel, type DuplicateFolderPickRegion } from "./duplicate-files-by-folder-panel";
import { DuplicateResultRow } from "./duplicate-files-result-row";

type DuplicateViewMode = "by-folder" | "by-file";

function DupColumnToolbarRow({
  markedOnPage,
  showSelectAll,
  showClearAll,
  onSelectAll,
  onClearAll,
}: {
  markedOnPage: number;
  showSelectAll: boolean;
  showClearAll: boolean;
  onSelectAll: () => void;
  onClearAll: () => void;
}): ReactElement {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-8 gap-y-2 pt-2 text-sm text-muted-foreground">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {showSelectAll ? (
          <button
            type="button"
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            onClick={onSelectAll}
          >
            Select all
          </button>
        ) : null}
        {showClearAll ? (
          <button
            type="button"
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            onClick={onClearAll}
          >
            Clear all
          </button>
        ) : null}
      </div>
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <span className="whitespace-nowrap">To delete: {markedOnPage}</span>
        <button
          type="button"
          disabled
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground opacity-60"
          title="Delete marked in this column (coming soon)"
          aria-label="Delete marked in this column (coming soon)"
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function FoldersWithDupHeaderLine({ text }: { text: string | null }): ReactElement {
  if (text == null) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  if (/\d+ folders$/.test(text)) {
    return <span className="text-sm font-medium text-muted-foreground">{text}</span>;
  }
  return <span className="break-all font-mono text-sm font-medium text-foreground">{text}</span>;
}

export function DesktopDuplicateFilesWorkspace({
  payload,
  currentPage,
  onPageChange,
  onClose,
}: {
  payload: FolderDuplicateScanResultPayload;
  currentPage: number;
  onPageChange: (page: number) => void;
  onClose: () => void;
}): ReactElement {
  const dateFormat = useDesktopStore((s) => s.mediaViewerSettings.dateFormat);
  const rows = payload.rows;

  const [viewMode, setViewMode] = useState<DuplicateViewMode>("by-folder");
  const [filterFolder, setFilterFolder] = useState<string | null>(null);
  const [filterFolderRegion, setFilterFolderRegion] = useState<DuplicateFolderPickRegion | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [markedForDelete, setMarkedForDelete] = useState<ReadonlySet<string>>(() => new Set());
  const [folderMediaCounts, setFolderMediaCounts] = useState<Record<string, number>>({});
  const [selectionScopeMediaCount, setSelectionScopeMediaCount] = useState<number | null>(null);

  const folderSummaries = useMemo(() => buildDuplicateFolderSummaries(payload), [payload]);

  const { outside: outsideSummaries, inside: insideSummaries } = useMemo(
    () => splitDuplicateFolderSummariesBySelectionDiskTree(folderSummaries, payload.folderPath),
    [folderSummaries, payload.folderPath],
  );

  const scopedWithDuplicateOutsideCount = useMemo(
    () => countScopedFilesWithDuplicateOutsideDiskTree(payload),
    [payload],
  );

  const scopedWithDuplicateInsideCount = useMemo(
    () => countScopedFilesWithDuplicateInsideDiskTree(payload),
    [payload],
  );

  const outsideDuplicateBytesTotal = useMemo(
    () => totalByteSizeOfDuplicatesOutsideDiskTree(payload),
    [payload],
  );

  const insideDuplicateBytesTotal = useMemo(
    () => totalByteSizeOfDuplicatesInsideDiskTree(payload),
    [payload],
  );

  const selectionRootComparable = useMemo(() => normalizedScanRoot(payload.folderPath), [payload.folderPath]);
  const selectionRootLower = selectionRootComparable.toLowerCase();

  const hasSelectionSubfolders = useMemo(() => {
    if (payload.recursive) {
      return true;
    }
    return insideSummaries.some((s) => comparableFilePath(s.folderPath).toLowerCase() !== selectionRootLower);
  }, [insideSummaries, payload.recursive, selectionRootLower]);

  const folderPathsForCounts = useMemo(() => {
    const u = new Set<string>();
    for (const s of outsideSummaries) {
      u.add(s.folderPath);
    }
    for (const s of insideSummaries) {
      u.add(s.folderPath);
    }
    return [...u].sort();
  }, [outsideSummaries, insideSummaries]);

  useEffect(() => {
    if (folderPathsForCounts.length === 0) {
      setFolderMediaCounts({});
      return;
    }
    let cancelled = false;
    void window.desktopApi.countMediaItemsByParentFolders({ folderPaths: folderPathsForCounts }).then((res) => {
      if (cancelled) {
        return;
      }
      if (res.ok) {
        setFolderMediaCounts(res.counts);
      } else {
        setFolderMediaCounts({});
      }
    });
    return () => {
      cancelled = true;
    };
  }, [folderPathsForCounts]);

  useEffect(() => {
    let cancelled = false;
    void window.desktopApi
      .countMediaItemsInFolderScope({
        folderPath: payload.folderPath,
        recursive: payload.recursive,
      })
      .then((res) => {
        if (cancelled) {
          return;
        }
        if (res.ok) {
          setSelectionScopeMediaCount(res.count);
        } else {
          setSelectionScopeMediaCount(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [payload.folderPath, payload.recursive]);

  useEffect(() => {
    setViewMode("by-folder");
    setFilterFolder(null);
    setFilterFolderRegion(null);
    setMarkedForDelete(new Set());
  }, [payload]);

  useEffect(() => {
    if (filterFolder == null) {
      setFilterFolderRegion(null);
    }
  }, [filterFolder]);

  const filteredRows = useMemo((): FolderDuplicateScanRow[] => {
    if (!filterFolder) return rows;
    return rows.filter((row) => rowMatchesFolderFilter(row, filterFolder));
  }, [rows, filterFolder]);

  const pageSliceFullList = useMemo(() => {
    const base = currentPage * ALBUM_ITEMS_PAGE_SIZE;
    return filteredRows.slice(base, base + ALBUM_ITEMS_PAGE_SIZE);
  }, [filteredRows, currentPage]);

  const paginationTotal = filteredRows.length;

  const pathStyle = useMemo(
    () =>
      inferPathDisplayStyle(
        (filterFolder && filterFolderRegion === "inside" ? filterFolder : payload.folderPath).trim(),
      ),
    [filterFolder, filterFolderRegion, payload.folderPath],
  );

  const scanRootComparable = useMemo(() => comparableFilePath(payload.folderPath.trim()), [payload.folderPath]);

  const workspacePathDisplay = useMemo(
    () => formatComparablePathForDisplay(scanRootComparable, pathStyle),
    [scanRootComparable, pathStyle],
  );

  const selectedFolderSubheaderDisplay = useMemo(() => {
    if (!filterFolder || !filterFolderRegion) {
      return workspacePathDisplay;
    }
    if (filterFolderRegion === "outside") {
      return workspacePathDisplay;
    }
    return formatComparablePathForDisplay(comparableFilePath(filterFolder.trim()), pathStyle);
  }, [filterFolder, filterFolderRegion, workspacePathDisplay, pathStyle]);

  const foldersWithDupSubheaderText = useMemo((): string | null => {
    if (!filterFolder || !filterFolderRegion) {
      return null;
    }
    if (filterFolderRegion === "outside") {
      return formatComparablePathForDisplay(comparableFilePath(filterFolder.trim()), pathStyle);
    }
    const map = new Map<string, string>();
    for (const row of filteredRows) {
      for (const d of row.duplicates) {
        const p = comparableFilePath(parentFolderPath(d.sourcePath));
        if (p) {
          map.set(p.toLowerCase(), p);
        }
      }
    }
    const folders = [...map.values()].sort((a, b) => a.localeCompare(b));
    if (folders.length === 0) {
      return null;
    }
    if (folders.length === 1) {
      return formatComparablePathForDisplay(folders[0]!, pathStyle);
    }
    return `${folders.length} folders`;
  }, [filterFolder, filterFolderRegion, filteredRows, pathStyle]);

  const selectedColumnRootComparable = useMemo(() => {
    if (filterFolder && filterFolderRegion === "inside") {
      return comparableFilePath(filterFolder.trim());
    }
    return scanRootComparable;
  }, [filterFolder, filterFolderRegion, scanRootComparable]);

  const pageMarkKeys = useMemo(() => {
    const scoped: string[] = [];
    const dup: string[] = [];
    for (const row of pageSliceFullList) {
      scoped.push(`scoped:${row.mediaItemId}`);
      for (const d of row.duplicates) {
        dup.push(`dup:${d.mediaItemId}`);
      }
    }
    return { scoped, dup };
  }, [pageSliceFullList]);

  const markedScopedOnPage = useMemo(
    () => pageMarkKeys.scoped.filter((k) => markedForDelete.has(k)).length,
    [pageMarkKeys.scoped, markedForDelete],
  );

  const markedDupOnPage = useMemo(
    () => pageMarkKeys.dup.filter((k) => markedForDelete.has(k)).length,
    [pageMarkKeys.dup, markedForDelete],
  );

  const handleToggleMarkForDelete = useCallback((key: string, next: boolean) => {
    setMarkedForDelete((prev) => {
      const copy = new Set(prev);
      if (next) {
        copy.add(key);
      } else {
        copy.delete(key);
      }
      return copy;
    });
  }, []);

  const handleSelectAllScopedOnPage = useCallback(() => {
    setMarkedForDelete((prev) => {
      const keys = pageMarkKeys.scoped;
      const allOn = keys.length > 0 && keys.every((k) => prev.has(k));
      const next = new Set(prev);
      if (allOn) {
        keys.forEach((k) => {
          next.delete(k);
        });
      } else {
        keys.forEach((k) => {
          next.add(k);
        });
      }
      return next;
    });
  }, [pageMarkKeys.scoped]);

  const handleSelectAllDupOnPage = useCallback(() => {
    setMarkedForDelete((prev) => {
      const keys = pageMarkKeys.dup;
      const allOn = keys.length > 0 && keys.every((k) => prev.has(k));
      const next = new Set(prev);
      if (allOn) {
        keys.forEach((k) => {
          next.delete(k);
        });
      } else {
        keys.forEach((k) => {
          next.add(k);
        });
      }
      return next;
    });
  }, [pageMarkKeys.dup]);

  const handleClearScopedOnPage = useCallback(() => {
    setMarkedForDelete((prev) => {
      const next = new Set(prev);
      pageMarkKeys.scoped.forEach((k) => {
        next.delete(k);
      });
      return next;
    });
  }, [pageMarkKeys.scoped]);

  const handleClearDupOnPage = useCallback(() => {
    setMarkedForDelete((prev) => {
      const next = new Set(prev);
      pageMarkKeys.dup.forEach((k) => {
        next.delete(k);
      });
      return next;
    });
  }, [pageMarkKeys.dup]);

  useEffect(() => {
    onPageChange(0);
  }, [viewMode, filterFolder, onPageChange]);

  const summaryParts = useMemo(() => {
    const parts: string[] = [];
    const large = payload.skippedLargeFileCount;
    const missingDisk = payload.skippedMissingOnDiskCount;
    const totalUnresolved = payload.skippedMissingContentHashCount;
    const noFingerprintElsewhere = Math.max(0, totalUnresolved - large - missingDisk);

    if (noFingerprintElsewhere > 0) {
      parts.push(
        `${noFingerprintElsewhere} file(s) miss metadata needed for hashing in the database — run a folder scan.`,
      );
    }
    if (missingDisk > 0) {
      parts.push(`${missingDisk} file(s) are missing on disk and were skipped for duplicate matching.`);
    }
    return parts;
  }, [payload]);

  const handleSelectFolderFromOverview = useCallback((folderPath: string, region: DuplicateFolderPickRegion) => {
    setFilterFolder(folderPath);
    setFilterFolderRegion(region);
    setViewMode("by-file");
  }, []);

  const handlePrimaryBack = useCallback(() => {
    if (viewMode === "by-file") {
      setFilterFolder(null);
      setFilterFolderRegion(null);
      setViewMode("by-folder");
      return;
    }
    onClose();
  }, [viewMode, onClose]);

  const primaryBackLabel = viewMode === "by-file" ? "Back to duplicate folders" : "Exit duplicates view";

  const byFileHasTable = viewMode === "by-file" && pageSliceFullList.length > 0;

  const scopedSelectAllVisible =
    pageMarkKeys.scoped.length > 0 && !pageMarkKeys.scoped.every((k) => markedForDelete.has(k));
  const scopedClearAllVisible = pageMarkKeys.scoped.some((k) => markedForDelete.has(k));
  const dupSelectAllVisible =
    pageMarkKeys.dup.length > 0 && !pageMarkKeys.dup.every((k) => markedForDelete.has(k));
  const dupClearAllVisible = pageMarkKeys.dup.some((k) => markedForDelete.has(k));

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted/40"
          onClick={handlePrimaryBack}
          aria-label={primaryBackLabel}
          title={primaryBackLabel}
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Back
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold leading-tight text-foreground">
            <span>Duplicates in folder</span>
            {payload.recursive ? (
              <span className="ml-1.5 align-middle text-sm font-normal text-muted-foreground">(with subfolders)</span>
            ) : null}
          </h1>
          <p className="mt-0.5 truncate text-sm text-muted-foreground" title={payload.folderPath}>
            {payload.folderPath}
          </p>
          {summaryParts.length > 0 ? (
            <div className="mt-1 space-y-1 text-xs text-amber-400/90">
              {summaryParts.map((line, i) => (
                <p key={i} className="leading-snug">
                  {line}
                </p>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-border p-0.5">
            <button
              type="button"
              className={cn(
                "rounded px-3 py-1.5 text-sm transition-colors",
                viewMode === "by-folder" ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => {
                setFilterFolder(null);
                setFilterFolderRegion(null);
                setViewMode("by-folder");
              }}
            >
              By folder
            </button>
            <button
              type="button"
              className={cn(
                "rounded px-3 py-1.5 text-sm transition-colors",
                viewMode === "by-file" ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setViewMode("by-file")}
            >
              By file
            </button>
          </div>
          <button
            type="button"
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              insightsOpen && "border-primary/50 bg-muted/30 text-foreground",
            )}
            onClick={() => setInsightsOpen((v) => !v)}
            aria-expanded={insightsOpen}
            aria-label="How duplicate folder tables work"
            title="How duplicate folder tables work"
          >
            <Info size={22} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </header>

      {insightsOpen ? (
        <div className="shrink-0 border-b border-border bg-muted/20 px-4 py-3 text-base leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">How these tables relate</p>
          <ul className="mt-2 list-inside list-disc space-y-2">
            <li>
              Each region (<strong className="text-foreground">outside</strong> vs{" "}
              <strong className="text-foreground">inside</strong> the selected path on disk) has a section title, three
              metric cards, then a folder table. The section with more duplicate paths in its table appears first.
            </li>
            <li>
              <strong className="text-foreground">Duplicates</strong> on the cards is the share of catalog files in the
              scanned folder (same scope as the duplicate scan) that have at least one duplicate path in that region;{" "}
              <strong className="text-foreground">Files</strong> is the same count as that percentage’s numerator.{" "}
              <strong className="text-foreground">Size</strong> on the cards uses GB with one decimal when the total is at
              least 1 GB, otherwise MB. The folder table <strong className="text-foreground">Size</strong> column uses Kb,
              Mb, or Gb. Click <strong className="text-foreground">Duplicates</strong> or <strong className="text-foreground">Size</strong>{" "}
              in the table header to sort that column (highest first).
            </li>
            <li>
              In each table, <strong className="text-foreground">Duplicates</strong> is how many duplicate paths sit in
              that folder; <strong className="text-foreground">% of folder</strong> compares that to catalog items stored
              directly in that folder.
            </li>
            <li>
              Click a folder row to switch to <strong className="text-foreground">By file</strong> filtered to files in
              that directory (scoped items or duplicate paths stored there).
            </li>
          </ul>
        </div>
      ) : null}

      <div className={cn("min-h-0 flex-1 overflow-auto px-4", byFileHasTable ? "pb-3 pt-0" : "py-3")}>
        {viewMode === "by-folder" ? (
          <DuplicateFilesByFolderPanel
            outsideSummaries={outsideSummaries}
            insideSummaries={insideSummaries}
            folderMediaCounts={folderMediaCounts}
            hasSelectionSubfolders={hasSelectionSubfolders}
            onSelectFolder={handleSelectFolderFromOverview}
            selectionScopeMediaCount={selectionScopeMediaCount}
            scopedWithDuplicateOutsideCount={scopedWithDuplicateOutsideCount}
            outsideDuplicateBytesTotal={outsideDuplicateBytesTotal}
            scopedWithDuplicateInsideCount={scopedWithDuplicateInsideCount}
            insideDuplicateBytesTotal={insideDuplicateBytesTotal}
          />
        ) : pageSliceFullList.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {filteredRows.length === 0
              ? "No rows match the current filter."
              : "No duplicate files found for items in this folder with the same catalog hash (and on-disk hash when needed)."}
          </p>
        ) : (
          <>
            <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-background px-4 py-2.5">
              <div className="hidden max-lg:block space-y-5">
                <div className="space-y-1.5">
                  <div className="text-base font-semibold uppercase tracking-wide text-primary">Selected folder</div>
                  <div className="break-all font-mono text-sm font-medium text-foreground">{selectedFolderSubheaderDisplay}</div>
                  <DupColumnToolbarRow
                    markedOnPage={markedScopedOnPage}
                    showSelectAll={scopedSelectAllVisible}
                    showClearAll={scopedClearAllVisible}
                    onSelectAll={handleSelectAllScopedOnPage}
                    onClearAll={handleClearScopedOnPage}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="text-base font-semibold uppercase tracking-wide text-primary">Folders with duplicates</div>
                  <div className="min-h-[1.25rem]">
                    <FoldersWithDupHeaderLine text={foldersWithDupSubheaderText} />
                  </div>
                  <DupColumnToolbarRow
                    markedOnPage={markedDupOnPage}
                    showSelectAll={dupSelectAllVisible}
                    showClearAll={dupClearAllVisible}
                    onSelectAll={handleSelectAllDupOnPage}
                    onClearAll={handleClearDupOnPage}
                  />
                </div>
              </div>

              <div className="max-lg:hidden grid grid-cols-[144px_1fr_1fr] gap-x-3 gap-y-2">
                <div className="row-span-3" aria-hidden="true" />
                <div className="text-base font-semibold uppercase tracking-wide text-primary">Selected folder</div>
                <div className="text-base font-semibold uppercase tracking-wide text-primary">Folders with duplicates</div>

                <div className="min-w-0 break-all font-mono text-sm font-medium text-foreground">{selectedFolderSubheaderDisplay}</div>
                <div className="min-w-0">
                  <FoldersWithDupHeaderLine text={foldersWithDupSubheaderText} />
                </div>

                <DupColumnToolbarRow
                  markedOnPage={markedScopedOnPage}
                  showSelectAll={scopedSelectAllVisible}
                  showClearAll={scopedClearAllVisible}
                  onSelectAll={handleSelectAllScopedOnPage}
                  onClearAll={handleClearScopedOnPage}
                />
                <DupColumnToolbarRow
                  markedOnPage={markedDupOnPage}
                  showSelectAll={dupSelectAllVisible}
                  showClearAll={dupClearAllVisible}
                  onSelectAll={handleSelectAllDupOnPage}
                  onClearAll={handleClearDupOnPage}
                />
              </div>
            </div>
            <div className="mt-4 grid gap-4">
              {pageSliceFullList.map((row: FolderDuplicateScanRow) => (
                <DuplicateResultRow
                  key={row.mediaItemId}
                  row={row}
                  dateFormat={dateFormat}
                  scanRootComparable={selectedColumnRootComparable}
                  pathStyle={pathStyle}
                  markedForDelete={markedForDelete}
                  onToggleMark={handleToggleMarkForDelete}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {viewMode === "by-file" ? (
        <div className="shrink-0 border-t border-border px-4 py-3">
          <PeoplePaginationBar
            ariaLabel="Duplicate files pagination"
            currentPage={currentPage}
            totalItems={paginationTotal}
            pageSize={ALBUM_ITEMS_PAGE_SIZE}
            onPageChange={onPageChange}
          />
        </div>
      ) : null}
    </div>
  );
}
