import { useCallback, useEffect, useState, type ReactElement } from "react";
import type { TvBroadcastStatus } from "../../../shared/ipc";
import { startFolderBroadcast, stopBroadcast } from "../../actions/tv-broadcast-actions";
import { ConfirmActionDialog } from "../ConfirmActionDialog";
import { GuidedSlideModal } from "../guided-content/guided-slide-modal";
import { buildTvBroadcastHelpDeck } from "./tv-broadcast-help";

const helpDeck = buildTvBroadcastHelpDeck();

export function TvBroadcastDialogs({
  selectedFolder,
  port,
  requirePin,
  status,
  onStatusChange,
  startOpen,
  stopOpen,
  onCloseStart,
  onCloseStop,
}: {
  selectedFolder: string | null;
  port: number;
  requirePin: boolean;
  status: TvBroadcastStatus;
  onStatusChange: (status: TvBroadcastStatus) => void;
  startOpen: boolean;
  stopOpen: boolean;
  onCloseStart: () => void;
  onCloseStop: () => void;
}): ReactElement {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeInfo, setActiveInfo] = useState<TvBroadcastStatus | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!startOpen) {
      setError(null);
      setIsBusy(false);
    }
  }, [startOpen]);

  const handleConfirmStart = useCallback(async () => {
    if (!selectedFolder) {
      setError("Select a folder first.");
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      const result = await startFolderBroadcast(
        window.desktopApi,
        selectedFolder,
        port,
        requirePin,
      );
      onStatusChange(result.status);
      if (!result.ok) {
        setError(result.error ?? "Failed to start TV broadcast.");
        return;
      }
      setActiveInfo(result.status);
      onCloseStart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start TV broadcast.");
    } finally {
      setIsBusy(false);
    }
  }, [onCloseStart, onStatusChange, port, requirePin, selectedFolder]);

  const handleConfirmStop = useCallback(async () => {
    setIsBusy(true);
    try {
      const next = await stopBroadcast(window.desktopApi);
      onStatusChange(next);
      setActiveInfo(null);
      onCloseStop();
    } catch {
      // Keep dialog open; user can retry.
    } finally {
      setIsBusy(false);
    }
  }, [onCloseStop, onStatusChange]);

  return (
    <>
      <ConfirmActionDialog
        open={startOpen}
        title="Broadcast folder to TV"
        confirmLabel="Start broadcast"
        cancelLabel="Cancel"
        isBusy={isBusy}
        tone="default"
        emphasizeCancel={false}
        helpAriaLabel="How to view on TV"
        onHelp={() => setHelpOpen(true)}
        onConfirm={() => {
          void handleConfirmStart();
        }}
        onCancel={onCloseStart}
      >
        <p className="m-0">
          This computer will host a local web page for the selected folder. Open the link on your
          Smart TV browser, enter the PIN, and watch the Photo Viewer slideshow.
        </p>
        <p className="mt-3 m-0">
          TV and PC must be on the same Wi‑Fi. Windows Firewall may ask to allow this app once.
        </p>
        {error ? <p className="mt-3 m-0 text-destructive">{error}</p> : null}
      </ConfirmActionDialog>

      <ConfirmActionDialog
        open={Boolean(activeInfo?.active && activeInfo.url)}
        title="TV broadcast is active"
        confirmLabel="Got it"
        cancelLabel="Stop broadcast"
        isBusy={false}
        tone="default"
        emphasizeCancel={false}
        helpAriaLabel="How to view on TV"
        onHelp={() => setHelpOpen(true)}
        onConfirm={() => setActiveInfo(null)}
        onCancel={() => {
          void (async () => {
            const next = await stopBroadcast(window.desktopApi);
            onStatusChange(next);
            setActiveInfo(null);
          })();
        }}
      >
        <p className="m-0">Open this address in your TV web browser:</p>
        <p className="mt-2 m-0 break-all font-mono text-base text-foreground" data-testid="tv-broadcast-url">
          {activeInfo?.url}
        </p>
        {activeInfo?.requirePin !== false && activeInfo?.pin ? (
          <p className="mt-3 m-0">
            PIN:{" "}
            <span className="font-mono text-lg font-semibold text-foreground" data-testid="tv-broadcast-pin">
              {activeInfo.pin}
            </span>
          </p>
        ) : (
          <p className="mt-3 m-0">PIN is disabled for this broadcast — the TV opens the album directly.</p>
        )}
      </ConfirmActionDialog>

      <ConfirmActionDialog
        open={stopOpen}
        title="Stop TV broadcast?"
        confirmLabel="Stop broadcast"
        cancelLabel="Keep broadcasting"
        isBusy={isBusy}
        tone="destructive"
        helpAriaLabel="How to view on TV"
        onHelp={() => setHelpOpen(true)}
        onConfirm={() => {
          void handleConfirmStop();
        }}
        onCancel={onCloseStop}
      >
        <p className="m-0">
          The TV page will stop working immediately. You can start broadcasting again later from the
          TV toolbar icon.
        </p>
        {status.url ? (
          <p className="mt-2 m-0 break-all font-mono text-xs">{status.url}</p>
        ) : null}
      </ConfirmActionDialog>

      <GuidedSlideModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        flowTitle={helpDeck.flowTitle}
        slides={helpDeck.slides}
      />
    </>
  );
}
