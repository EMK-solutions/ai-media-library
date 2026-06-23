import { useCallback } from "react";
import type { DesktopMediaItemMetadata } from "../../shared/ipc";
import { comparableFilePath, lookupMediaMetadataByItemId } from "../lib/media-metadata-lookup";
import { useDesktopStoreApi } from "../stores/desktop-store";

export function useMediaItemStarRatingChange(): (sourcePath: string, starRating: number) => Promise<void> {
  const store = useDesktopStoreApi();

  return useCallback(
    async (sourcePath: string, starRating: number) => {
      const meta = lookupMediaMetadataByItemId<DesktopMediaItemMetadata>(
        sourcePath,
        store.getState().mediaMetadataByItemId,
      );
      const catalogPath = meta?.sourcePath ?? sourcePath;

      const result = await window.desktopApi.setMediaItemStarRating({
        sourcePath: catalogPath,
        starRating,
      });

      if (!result.success) {
        console.error(result.error ?? "Could not update star rating.");
        return;
      }

      if (result.metadata) {
        const metaResult = result.metadata;
        const keys = new Set(
          [
            sourcePath,
            catalogPath,
            metaResult.sourcePath,
            comparableFilePath(sourcePath),
            comparableFilePath(catalogPath),
            comparableFilePath(metaResult.sourcePath),
          ].filter((k) => typeof k === "string" && k.length > 0),
        );

        store.setState((s) => {
          const next = { ...s.mediaMetadataByItemId };
          for (const k of keys) {
            next[k] = metaResult;
          }
          s.mediaMetadataByItemId = next;
        });
      }

      if (result.fileWriteError) {
        console.warn(result.fileWriteError);
      }
    },
    [store],
  );
}
