import { useMemo, useState, type ReactElement } from "react";
import { albumFilterActiveChipClasses } from "../lib/album-filter-active-styles";
import { cn } from "../lib/cn";
import { PeopleTagsNameSearchRow } from "./people-tags-name-search-header";
import {
  getSemanticSearchVisiblePersonGroupIds,
  semanticSearchPersonGroupsShouldOfferShowAll,
  type PersonGroupListMeta,
} from "../lib/semantic-search-person-groups-visible";

const UI_TEXT = {
  heading: "People groups",
  nameFilterPlaceholder: "Name",
  showAllGroups: "Show all",
  hideAllGroups: "Hide all",
  noFilterMatches: "No groups match the filter.",
  maxGroupsHint: "Up to 3 groups",
  includeUnconfirmed: "Include unconfirmed similar faces",
} as const;

const MAX_RECENT_TOGGLED = 3;

export function SemanticSearchPersonGroupsBar({
  groupsMeta,
  selectedGroupIds,
  maxSelected,
  onToggleGroup,
  suppressTopDivider = false,
  warnNoGroupSelected = false,
  includeUnconfirmedFaces,
  onIncludeUnconfirmedFacesChange,
  includeUnconfirmedDisabled = false,
}: {
  groupsMeta: PersonGroupListMeta[];
  selectedGroupIds: readonly string[];
  maxSelected: number;
  onToggleGroup: (groupId: string) => void;
  /** When true, omit top border (e.g. first block under smart-album filters). */
  suppressTopDivider?: boolean;
  /** Highlight section title when user must pick a group. */
  warnNoGroupSelected?: boolean;
  includeUnconfirmedFaces?: boolean;
  onIncludeUnconfirmedFacesChange?: (checked: boolean) => void;
  includeUnconfirmedDisabled?: boolean;
}): ReactElement | null {
  const [nameFilter, setNameFilter] = useState("");
  const [groupsListExpanded, setGroupsListExpanded] = useState(false);
  const [lastToggledIds, setLastToggledIds] = useState<string[]>([]);

  const nameFilterTrimmed = nameFilter.trim();

  const visibleGroupIds = useMemo(
    () =>
      getSemanticSearchVisiblePersonGroupIds({
        allGroups: groupsMeta,
        nameFilterTrimmed,
        groupsListExpanded,
        lastToggledIds,
        selectedGroupIds,
      }),
    [groupsMeta, nameFilterTrimmed, groupsListExpanded, lastToggledIds, selectedGroupIds],
  );

  const visibleGroups = useMemo((): PersonGroupListMeta[] => {
    const byId = new Map(groupsMeta.map((g) => [g.id, g] as const));
    return visibleGroupIds
      .map((id) => byId.get(id))
      .filter((g): g is PersonGroupListMeta => Boolean(g));
  }, [visibleGroupIds, groupsMeta]);

  const shouldShowShowAll = useMemo(
    () =>
      semanticSearchPersonGroupsShouldOfferShowAll({
        allGroups: groupsMeta,
        nameFilterTrimmed,
        groupsListExpanded,
        lastToggledIds,
      }),
    [groupsMeta, nameFilterTrimmed, groupsListExpanded, lastToggledIds],
  );

  const handleChipClick = (groupId: string): void => {
    if (nameFilterTrimmed.length > 0) {
      setNameFilter("");
      setLastToggledIds((prev) => [groupId, ...prev.filter((id) => id !== groupId)].slice(0, MAX_RECENT_TOGGLED));
    }
    onToggleGroup(groupId);
  };

  if (groupsMeta.length === 0) {
    return null;
  }

  const showUnconfirmed =
    typeof includeUnconfirmedFaces === "boolean" && onIncludeUnconfirmedFacesChange !== undefined;

  const toolbar = (
    <PeopleTagsNameSearchRow
      value={nameFilter}
      onChange={setNameFilter}
      placeholder={UI_TEXT.nameFilterPlaceholder}
      trailingSlot={
        shouldShowShowAll || groupsListExpanded ? (
          <button
            type="button"
            onClick={() => setGroupsListExpanded((expanded) => !expanded)}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-ai-search-border bg-ai-search-control px-3 text-sm text-ai-search-text hover:border-ai-search-accent/60 hover:bg-ai-search-control/80"
          >
            {groupsListExpanded ? UI_TEXT.hideAllGroups : UI_TEXT.showAllGroups}
          </button>
        ) : null
      }
    />
  );

  return (
    <div
      className={cn(
        "space-y-2",
        !suppressTopDivider && "mt-3 border-t border-ai-search-border pt-3",
        suppressTopDivider && "mt-2",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h3
          className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            warnNoGroupSelected ? "text-amber-600 dark:text-amber-400" : "text-ai-search-muted",
          )}
        >
          {UI_TEXT.heading}
        </h3>
        <span className="text-xs font-normal normal-case tracking-normal text-ai-search-muted/90">
          {UI_TEXT.maxGroupsHint}
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          {visibleGroups.map((group) => {
            const isSelected = selectedGroupIds.includes(group.id);
            const atMax = selectedGroupIds.length >= maxSelected && !isSelected;
            return (
              <button
                key={group.id}
                type="button"
                disabled={atMax}
                onClick={() => handleChipClick(group.id)}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center rounded-md border px-3 text-sm transition",
                  isSelected
                    ? albumFilterActiveChipClasses
                    : "border-ai-search-border bg-ai-search-control/60 text-ai-search-text/85 hover:border-ai-search-accent/60",
                  atMax && "cursor-not-allowed opacity-50",
                )}
              >
                {group.label}
              </button>
            );
          })}
        </div>
        {visibleGroups.length === 0 && nameFilterTrimmed.length > 0 ? (
          <p className="text-sm text-ai-search-muted">{UI_TEXT.noFilterMatches}</p>
        ) : null}
      </div>
      {showUnconfirmed ? (
        <label
          className="mt-1 flex cursor-pointer items-center gap-1.5 text-xs text-ai-search-text/80 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
          title={includeUnconfirmedDisabled ? "Select at least one people group" : undefined}
        >
          <input
            type="checkbox"
            className="cursor-pointer accent-ai-search-accent"
            checked={includeUnconfirmedFaces}
            disabled={includeUnconfirmedDisabled}
            onChange={(event) => onIncludeUnconfirmedFacesChange(event.target.checked)}
          />
          <span>{UI_TEXT.includeUnconfirmed}</span>
        </label>
      ) : null}
    </div>
  );
}
