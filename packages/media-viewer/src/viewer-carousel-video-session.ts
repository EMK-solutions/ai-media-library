import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import { createContext } from "react";

export interface ViewerPanelPlayback {
  itemId: string;
  currentTime: number;
  paused: boolean;
}

interface CarouselPlayback {
  currentTime: number;
  paused: boolean;
}

export interface ViewerCarouselVideoApi {
  readCarousel: (itemId: string) => CarouselPlayback | null;
  peekPanelPlayback: (itemId: string) => ViewerPanelPlayback | null;
  rememberPanelPlayback: (playback: ViewerPanelPlayback) => void;
}

export const ViewerCarouselVideoContext = createContext<ViewerCarouselVideoApi | null>(null);

export function createViewerCarouselVideoApi(
  videosRef: MutableRefObject<Record<string, HTMLVideoElement | null>>,
  panelPlaybackRef: MutableRefObject<ViewerPanelPlayback | null>,
): ViewerCarouselVideoApi {
  return {
    readCarousel(itemId: string): CarouselPlayback | null {
      const video = videosRef.current[itemId];
      if (!video) {
        return null;
      }
      return { currentTime: video.currentTime, paused: video.paused };
    },
    peekPanelPlayback(itemId: string): ViewerPanelPlayback | null {
      const playback = panelPlaybackRef.current;
      if (!playback || playback.itemId !== itemId) {
        return null;
      }
      return playback;
    },
    rememberPanelPlayback(playback: ViewerPanelPlayback): void {
      panelPlaybackRef.current = playback;
    },
  };
}

/**
 * The info panel covers the carousel player with its own `<video>`.
 * Pause the hidden carousel copy, and restore its position only when the panel closes.
 */
export function useViewerCarouselVideoHandoff(
  isOpen: boolean,
  showingInfo: boolean,
  currentIndex: number,
  videosRef: MutableRefObject<Record<string, HTMLVideoElement | null>>,
  userPausedItemIdRef: MutableRefObject<string | null>,
): { api: ViewerCarouselVideoApi; suppressCarouselRef: MutableRefObject<boolean> } {
  const suppressCarouselRef = useRef(false);
  suppressCarouselRef.current = isOpen && showingInfo;
  const panelPlaybackRef = useRef<ViewerPanelPlayback | null>(null);
  const wasShowingInfoRef = useRef(false);
  const api = useMemo(() => createViewerCarouselVideoApi(videosRef, panelPlaybackRef), [videosRef]);

  useLayoutEffect(() => {
    if (!isOpen) {
      wasShowingInfoRef.current = false;
      panelPlaybackRef.current = null;
      return;
    }
    if (showingInfo) {
      for (const video of Object.values(videosRef.current)) {
        if (video) {
          video.pause();
        }
      }
      wasShowingInfoRef.current = true;
      return;
    }
    if (!wasShowingInfoRef.current) {
      return;
    }
    wasShowingInfoRef.current = false;
    const playback = panelPlaybackRef.current;
    panelPlaybackRef.current = null;
    if (!playback) {
      return;
    }
    const video = videosRef.current[playback.itemId];
    if (!video) {
      return;
    }
    try {
      if (Number.isFinite(playback.currentTime) && Math.abs(video.currentTime - playback.currentTime) > 0.05) {
        video.currentTime = playback.currentTime;
      }
    } catch {
      // Seek can throw before the carousel video has metadata.
    }
    if (playback.paused) {
      userPausedItemIdRef.current = playback.itemId;
      video.pause();
      return;
    }
    if (userPausedItemIdRef.current === playback.itemId) {
      userPausedItemIdRef.current = null;
    }
    void video.play().catch(() => undefined);
  }, [currentIndex, isOpen, showingInfo, userPausedItemIdRef, videosRef]);

  return { api, suppressCarouselRef };
}
