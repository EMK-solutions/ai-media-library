import { useCallback, useMemo, useState, type ReactElement } from "react";
import type { PeopleWorkspaceOpenFacePhotoFn } from "@emk/media-viewer";
import { untaggedTabLog } from "../lib/untagged-tab-trace";
import { DesktopPeopleTagsListTab } from "./DesktopPeopleTagsListTab";
import { DesktopPeopleWorkspace } from "./DesktopPeopleWorkspace";
import { DesktopFaceClusterGrid } from "./DesktopFaceClusterGrid";
import { DesktopPeopleGroupsTab } from "./DesktopPeopleGroupsTab";
import { GuidedSlideModal } from "./guided-content/guided-slide-modal";
import { AiModelsReferenceSheet } from "./onboarding/ai-models-reference-sheet";
import {
  buildPeopleModuleHelpDeck,
  getPeopleModuleHelpInitialSlideIndex,
  type PeopleModuleTab,
} from "./onboarding/people-module-help";
import {
  handleGuidedSlideDeckAction,
  openOllamaInstallDocInBrowser,
} from "./onboarding/guided-slide-catalog";

type PeopleTab = PeopleModuleTab;

const TAB_LABELS: Record<PeopleTab, string> = {
  people: "People",
  tagged: "Tagged faces",
  untagged: "Untagged faces",
  groups: "People groups",
};

export function DesktopPeopleSection({
  onOpenFacePhoto,
}: {
  onOpenFacePhoto: PeopleWorkspaceOpenFacePhotoFn;
}): ReactElement {
  const [activeTab, setActiveTab] = useState<PeopleTab>("people");
  const [peopleHelpOpen, setPeopleHelpOpen] = useState(false);
  const [peopleHelpInitialIndex, setPeopleHelpInitialIndex] = useState(0);
  const [modelsReferenceOpen, setModelsReferenceOpen] = useState(false);

  const peopleHelpDeck = useMemo(() => buildPeopleModuleHelpDeck(), []);
  const visiblePeopleHelpSlideIds = useMemo(
    () => peopleHelpDeck.slides.map((s): string => s.id),
    [peopleHelpDeck.slides],
  );

  const openPeopleModuleHelp = useCallback(
    (tab: PeopleModuleTab) => {
      setPeopleHelpInitialIndex(
        getPeopleModuleHelpInitialSlideIndex(tab, visiblePeopleHelpSlideIds),
      );
      setPeopleHelpOpen(true);
    },
    [visiblePeopleHelpSlideIds],
  );

  const onPeopleSlideAction = useCallback((actionId: string): void => {
    const next = handleGuidedSlideDeckAction(actionId);
    if (next === "models") {
      setModelsReferenceOpen(true);
    }
    if (next === "ollama-doc") {
      openOllamaInstallDocInBrowser();
    }
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-border px-4 pt-2 md:px-8">
        {(["people", "groups", "tagged", "untagged"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              if (tab === "untagged") {
                untaggedTabLog('Tab button click "Untagged faces" (before setState)');
              }
              setActiveTab(tab);
            }}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {TAB_LABELS[tab]}
            {activeTab === tab ? (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
            ) : null}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeTab === "people" ? (
          <DesktopPeopleTagsListTab onOpenPeopleModuleHelp={() => openPeopleModuleHelp("people")} />
        ) : activeTab === "tagged" ? (
          <DesktopPeopleWorkspace
            onOpenFacePhoto={onOpenFacePhoto}
            onOpenPeopleModuleHelp={() => openPeopleModuleHelp("tagged")}
          />
        ) : activeTab === "untagged" ? (
          <DesktopFaceClusterGrid
            onOpenFacePhoto={onOpenFacePhoto}
            onOpenPeopleModuleHelp={() => openPeopleModuleHelp("untagged")}
          />
        ) : (
          <DesktopPeopleGroupsTab
            onOpenPeopleModuleHelp={() => openPeopleModuleHelp("groups")}
          />
        )}
      </div>

      <GuidedSlideModal
        open={peopleHelpOpen}
        onClose={() => {
          setPeopleHelpOpen(false);
        }}
        flowTitle={peopleHelpDeck.flowTitle}
        slides={peopleHelpDeck.slides}
        initialSlideIndex={peopleHelpInitialIndex}
        slideHeadlineAsPrimaryExceptFirst
        firstSlideUseSlideHeadlineAsSolePrimary
        onSlideAction={onPeopleSlideAction}
      />
      <AiModelsReferenceSheet open={modelsReferenceOpen} onClose={() => setModelsReferenceOpen(false)} />
    </div>
  );
}
