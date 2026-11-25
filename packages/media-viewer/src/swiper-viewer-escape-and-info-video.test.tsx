// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MediaSwiperViewer } from "./swiper-viewer";
import { ViewerInfoPanelVideo } from "./viewer-info-panel-video";
import type { MediaSwiperViewerItem } from "./types";

vi.mock("swiper/react", () => ({
  Swiper: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-swiper">{children}</div>,
  SwiperSlide: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("swiper/modules", () => ({
  FreeMode: {},
  Keyboard: {},
  Mousewheel: {},
  Thumbs: {},
}));

const photos: MediaSwiperViewerItem[] = [
  {
    id: "1",
    title: "Photo 1",
    storage_url: "https://example.com/1.jpg",
    thumbnail_url: "https://example.com/1-thumb.jpg",
    mediaType: "image",
  },
];

const videoItem: MediaSwiperViewerItem = {
  id: "vid-1",
  title: "Clip",
  storage_url: "https://example.com/clip.mp4",
  thumbnail_url: "https://example.com/clip.jpg",
  mediaType: "video",
};

describe("MediaSwiperViewer close and video info panel", () => {
  const played: HTMLMediaElement[] = [];

  beforeEach(() => {
    played.length = 0;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    class ResizeObserverMock {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
      played.push(this);
      Object.defineProperty(this, "paused", { configurable: true, get: () => false });
      this.dispatchEvent(new Event("play"));
      return Promise.resolve();
    });
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) {
      const alreadyPaused = this.paused;
      Object.defineProperty(this, "paused", { configurable: true, get: () => true });
      if (!alreadyPaused) {
        this.dispatchEvent(new Event("pause"));
      }
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("closes the viewer on Escape", () => {
    const onClose = vi.fn();
    render(
      <MediaSwiperViewer
        isOpen
        items={photos}
        currentIndex={0}
        onIndexChange={() => undefined}
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes the viewer on Escape while the info panel is open", () => {
    const onClose = vi.fn();
    const onInfoPanelOpenChange = vi.fn();
    render(
      <MediaSwiperViewer
        isOpen
        items={photos}
        currentIndex={0}
        onIndexChange={() => undefined}
        onClose={onClose}
        infoPanelOpen
        onInfoPanelOpenChange={onInfoPanelOpenChange}
        renderInfoPanel={() => <div>Info</div>}
      />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onInfoPanelOpenChange).not.toHaveBeenCalled();
  });

  it("leaves Escape to a control that already handled it", () => {
    const onClose = vi.fn();
    render(
      <MediaSwiperViewer
        isOpen
        items={photos}
        currentIndex={0}
        onIndexChange={() => undefined}
        onClose={onClose}
        infoPanelOpen
        onInfoPanelOpenChange={() => undefined}
        renderInfoPanel={() => (
          <input
            aria-label="Person name"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
          />
        )}
      />,
    );
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Person name" }), { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not restart a paused video when the info panel opens and items refresh", () => {
    const view = render(
      <MediaSwiperViewer
        isOpen
        items={[videoItem]}
        currentIndex={0}
        onIndexChange={() => undefined}
        onClose={() => undefined}
        autoPlayVideoOnSelection
        renderInfoPanel={(item) => (
          <ViewerInfoPanelVideo itemId={item.id} src={item.storage_url ?? ""} ariaLabel={item.title ?? "Video"} />
        )}
      />,
    );

    const carousel = document.querySelector("video[data-emk-viewer-video='carousel']");
    expect(carousel).toBeInstanceOf(HTMLVideoElement);
    const carouselPlays = (): number =>
      played.filter((element) => element.getAttribute("data-emk-viewer-video") === "carousel").length;
    const playsAfterOpen = carouselPlays();
    expect(playsAfterOpen).toBeGreaterThan(0);

    (carousel as HTMLVideoElement).pause();

    view.rerender(
      <MediaSwiperViewer
        isOpen
        items={[{ ...videoItem }]}
        currentIndex={0}
        onIndexChange={() => undefined}
        onClose={() => undefined}
        autoPlayVideoOnSelection
        infoPanelOpen
        onInfoPanelOpenChange={() => undefined}
        renderInfoPanel={(item) => (
          <ViewerInfoPanelVideo itemId={item.id} src={item.storage_url ?? ""} ariaLabel={item.title ?? "Video"} />
        )}
      />,
    );

    const infoVideo = document.querySelector("video[data-emk-viewer-video='info-panel']");
    expect(infoVideo).toBeInstanceOf(HTMLVideoElement);
    expect((infoVideo as HTMLVideoElement).paused).toBe(true);
    expect((carousel as HTMLVideoElement).paused).toBe(true);
    expect(carouselPlays()).toBe(playsAfterOpen);

    view.rerender(
      <MediaSwiperViewer
        isOpen
        items={[{ ...videoItem, title: "Clip refreshed" }]}
        currentIndex={0}
        onIndexChange={() => undefined}
        onClose={() => undefined}
        autoPlayVideoOnSelection
        infoPanelOpen
        onInfoPanelOpenChange={() => undefined}
        renderInfoPanel={(item) => (
          <ViewerInfoPanelVideo itemId={item.id} src={item.storage_url ?? ""} ariaLabel={item.title ?? "Video"} />
        )}
      />,
    );

    expect(carouselPlays()).toBe(playsAfterOpen);
    expect((carousel as HTMLVideoElement).paused).toBe(true);
    expect((infoVideo as HTMLVideoElement).paused).toBe(true);
  });
});
