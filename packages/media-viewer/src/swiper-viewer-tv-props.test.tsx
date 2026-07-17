// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MediaSwiperViewer } from "./swiper-viewer";
import type { MediaSwiperViewerItem } from "./types";
import { THUMB_DIMENSIONS } from "./viewer-styles";

vi.mock("swiper/react", () => ({
  Swiper: ({
    children,
    allowTouchMove,
  }: {
    children: React.ReactNode;
    allowTouchMove?: boolean;
  }) => (
    <div data-testid="mock-swiper" data-allow-touch-move={String(allowTouchMove ?? true)}>
      {children}
    </div>
  ),
  SwiperSlide: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("swiper/modules", () => ({
  FreeMode: {},
  Keyboard: {},
  Mousewheel: {},
  Thumbs: {},
}));

const items: MediaSwiperViewerItem[] = [
  {
    id: "1",
    title: "Photo 1",
    storage_url: "https://example.com/1.jpg",
    thumbnail_url: "https://example.com/1-thumb.jpg",
    mediaType: "image",
  },
  {
    id: "2",
    title: "Photo 2",
    storage_url: "https://example.com/2.jpg",
    thumbnail_url: "https://example.com/2-thumb.jpg",
    mediaType: "image",
  },
];

describe("MediaSwiperViewer TV props", () => {
  beforeEach(() => {
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
  });

  afterEach(cleanup);

  it("defines tv thumb dimensions wider than large", () => {
    expect(THUMB_DIMENSIONS.tv.railWidth).toBeGreaterThan(THUMB_DIMENSIONS.large.railWidth);
  });

  it("hides info button when renderInfoPanel is omitted", () => {
    render(
      <MediaSwiperViewer
        isOpen
        items={items}
        currentIndex={0}
        onIndexChange={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(screen.queryByRole("button", { name: "Show info" })).not.toBeInTheDocument();
  });

  it("hides close and fullscreen buttons when flags are false", () => {
    render(
      <MediaSwiperViewer
        isOpen
        items={items}
        currentIndex={0}
        onIndexChange={() => undefined}
        onClose={() => undefined}
        showCloseButton={false}
        showFullscreenButton={false}
      />,
    );
    expect(screen.queryByRole("button", { name: "Close viewer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enter fullscreen" })).not.toBeInTheDocument();
  });

  it("passes allowTouchMove=false to swipers", () => {
    render(
      <MediaSwiperViewer
        isOpen
        items={items}
        currentIndex={0}
        onIndexChange={() => undefined}
        onClose={() => undefined}
        allowTouchMove={false}
      />,
    );
    const swipers = screen.getAllByTestId("mock-swiper");
    expect(swipers.length).toBeGreaterThan(0);
    for (const swiper of swipers) {
      expect(swiper).toHaveAttribute("data-allow-touch-move", "false");
    }
  });

  it("auto-starts slideshow when autoStartSlideshow is true", async () => {
    render(
      <MediaSwiperViewer
        isOpen
        items={items}
        currentIndex={0}
        onIndexChange={() => undefined}
        onClose={() => undefined}
        autoStartSlideshow
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Pause slideshow" })).toBeInTheDocument();
    });
  });
});
