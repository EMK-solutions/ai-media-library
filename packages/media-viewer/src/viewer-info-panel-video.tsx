import { useContext, useLayoutEffect, useRef, type CSSProperties, type ReactElement, type ReactNode } from "react";
import {
  ViewerCarouselVideoContext,
  type ViewerCarouselVideoApi,
} from "./viewer-carousel-video-session";

const infoPanelVideoStyle: CSSProperties = {
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
};

export function ViewerCarouselVideoProvider({
  api,
  children,
}: {
  api: ViewerCarouselVideoApi;
  children: ReactNode;
}): ReactElement {
  return <ViewerCarouselVideoContext.Provider value={api}>{children}</ViewerCarouselVideoContext.Provider>;
}

function seekPanelVideo(
  video: HTMLVideoElement,
  playback: { currentTime: number; paused: boolean },
  onApplied: () => void,
): void {
  const apply = (): void => {
    if (Number.isFinite(playback.currentTime) && playback.currentTime > 0) {
      try {
        if (Math.abs(video.currentTime - playback.currentTime) > 0.05) {
          video.currentTime = playback.currentTime;
        }
      } catch {
        // Metadata may not be ready on the first attempt.
      }
    }
    if (playback.paused) {
      video.pause();
    } else {
      void video.play().catch(() => undefined);
    }
    onApplied();
  };
  if (video.readyState >= 1) {
    apply();
    return;
  }
  video.addEventListener("loadedmetadata", apply, { once: true });
}

/** Visible player beside the info panel. Continues the carousel video instead of starting a second one. */
export function ViewerInfoPanelVideo({
  itemId,
  src,
  ariaLabel,
}: {
  itemId: string;
  src: string;
  ariaLabel?: string;
}): ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const api = useContext(ViewerCarouselVideoContext);
  const apiRef = useRef(api);
  apiRef.current = api;
  const allowPublishRef = useRef(false);

  useLayoutEffect(() => {
    const video = videoRef.current;
    const session = apiRef.current;
    if (!video || !session) {
      return;
    }
    allowPublishRef.current = false;
    const existing = session.peekPanelPlayback(itemId);
    const playback = existing ?? session.readCarousel(itemId);
    if (!playback) {
      return;
    }
    if (!existing) {
      session.rememberPanelPlayback({
        itemId,
        currentTime: playback.currentTime,
        paused: playback.paused,
      });
    }
    seekPanelVideo(video, playback, () => {
      allowPublishRef.current = true;
    });
  }, [itemId, src]);

  const publish = (): void => {
    if (!allowPublishRef.current) {
      return;
    }
    const video = videoRef.current;
    const session = apiRef.current;
    if (!video || !session) {
      return;
    }
    session.rememberPanelPlayback({
      itemId,
      currentTime: video.currentTime,
      paused: video.paused,
    });
  };

  return (
    <video
      ref={videoRef}
      src={src}
      controls
      preload="metadata"
      playsInline
      data-emk-viewer-video="info-panel"
      style={infoPanelVideoStyle}
      aria-label={ariaLabel}
      onPlay={publish}
      onPause={publish}
      onSeeked={publish}
      onTimeUpdate={publish}
    />
  );
}
