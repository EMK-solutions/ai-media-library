import { useCallback, useEffect, useState, type CSSProperties, type ReactElement } from "react";
import { MediaSwiperViewer, type MediaSwiperViewerItem } from "@emk/media-viewer";

interface PlaylistResponse {
  folderName: string;
  items: Array<{
    id: string;
    name: string;
    mediaKind: "image" | "video";
    mediaUrl: string;
    thumbUrl: string;
  }>;
}

type Phase = "pin" | "loading" | "viewer" | "error";

const pinScreenStyle: CSSProperties = {
  minHeight: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 32,
  boxSizing: "border-box",
};

const cardStyle: CSSProperties = {
  width: "min(480px, 100%)",
  border: "1px solid rgba(148,163,184,0.35)",
  borderRadius: 16,
  padding: 28,
  background: "rgba(15,23,42,0.92)",
};

export function TvBroadcastApp(): ReactElement {
  const [phase, setPhase] = useState<Phase>("pin");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<MediaSwiperViewerItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [folderName, setFolderName] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/status", { credentials: "include" });
        if (!res.ok) return;
        const body = (await res.json()) as { authenticated?: boolean };
        if (body.authenticated) {
          setPhase("loading");
          await loadPlaylist();
        }
      } catch {
        // Stay on PIN screen.
      }
    })();
  }, []);

  const loadPlaylist = useCallback(async (): Promise<void> => {
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch("/api/playlist", { credentials: "include" });
      if (res.status === 401) {
        setPhase("pin");
        setError("PIN required.");
        return;
      }
      if (!res.ok) {
        setPhase("error");
        setError("Could not load playlist.");
        return;
      }
      const body = (await res.json()) as PlaylistResponse;
      setFolderName(body.folderName);
      setItems(
        body.items.map((item) => ({
          id: item.id,
          title: item.name,
          storage_url: item.mediaUrl,
          thumbnail_url: item.thumbUrl,
          mediaType: item.mediaKind === "video" ? "video" : "image",
        })),
      );
      setCurrentIndex(0);
      setPhase("viewer");
    } catch {
      setPhase("error");
      setError("Could not load playlist.");
    }
  }, []);

  const submitPin = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });
      if (!res.ok) {
        setError("Incorrect PIN. Try again.");
        return;
      }
      await loadPlaylist();
    } catch {
      setError("Could not reach the desktop app. Check Wi‑Fi and the URL.");
    }
  }, [loadPlaylist, pin]);

  if (phase === "viewer" && items.length > 0) {
    return (
      <MediaSwiperViewer
        isOpen
        items={items}
        currentIndex={currentIndex}
        onIndexChange={setCurrentIndex}
        onClose={() => undefined}
        thumbSize="tv"
        allowTouchMove={false}
        autoStartSlideshow
        autoEnterFullscreen
        showCloseButton={false}
        showFullscreenButton={false}
        autoPlayInitialVideo
        autoPlayVideoOnSelection
      />
    );
  }

  return (
    <div style={pinScreenStyle}>
      <div style={cardStyle}>
        <h1 style={{ margin: 0, fontSize: 28 }}>TV Broadcast</h1>
        <p style={{ marginTop: 12, lineHeight: 1.5, color: "#94a3b8" }}>
          {folderName
            ? `Enter the PIN shown in AI Media Library to view “${folderName}”.`
            : "Enter the 4-digit PIN shown in AI Media Library on your computer."}
        </p>
        {phase === "loading" ? (
          <p style={{ marginTop: 20 }}>Loading…</p>
        ) : (
          <>
            <label style={{ display: "block", marginTop: 20 }}>
              <span style={{ display: "block", marginBottom: 8 }}>PIN</span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submitPin();
                }}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  fontSize: 28,
                  letterSpacing: 8,
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "1px solid #475569",
                  background: "#0f172a",
                  color: "#f8fafc",
                }}
                aria-label="Broadcast PIN"
                autoFocus
              />
            </label>
            <button
              type="button"
              onClick={() => {
                void submitPin();
              }}
              style={{
                marginTop: 20,
                width: "100%",
                minHeight: 52,
                fontSize: 18,
                borderRadius: 10,
                border: "none",
                background: "#3b82f6",
                color: "white",
                cursor: "pointer",
              }}
            >
              Open album
            </button>
          </>
        )}
        {error || phase === "error" ? (
          <p style={{ marginTop: 16, color: "#f87171" }} role="alert">
            {error ?? "Something went wrong."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
