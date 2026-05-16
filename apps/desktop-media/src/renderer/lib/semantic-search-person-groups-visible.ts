export interface PersonGroupListMeta {
  id: string;
  label: string;
}

const MAX_COLLAPSED = 3;
const MAX_RECENT_TOGGLED = 3;

function collapsedGroupIdsNoFilter(
  allGroups: readonly PersonGroupListMeta[],
  lastToggledIds: readonly string[],
): string[] {
  const sorted = allGroups.slice().sort((a, b) => a.label.localeCompare(b.label));
  const first = sorted.slice(0, MAX_COLLAPSED).map((g) => g.id);
  const seen = new Set(first);
  const out = [...first];
  for (const id of lastToggledIds) {
    if (out.length >= MAX_COLLAPSED + MAX_RECENT_TOGGLED) {
      break;
    }
    if (seen.has(id)) {
      continue;
    }
    if (!allGroups.some((g) => g.id === id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function getSemanticSearchVisiblePersonGroupIds(args: {
  allGroups: readonly PersonGroupListMeta[];
  nameFilterTrimmed: string;
  groupsListExpanded: boolean;
  lastToggledIds: readonly string[];
  selectedGroupIds: readonly string[];
}): string[] {
  const { allGroups, nameFilterTrimmed, groupsListExpanded, lastToggledIds, selectedGroupIds } = args;
  const q = nameFilterTrimmed.toLowerCase();
  const matchesFilter = (label: string): boolean => !q || label.toLowerCase().includes(q);

  let ids: string[];
  if (groupsListExpanded || q) {
    ids = allGroups.filter((g) => matchesFilter(g.label)).map((g) => g.id);
  } else {
    ids = collapsedGroupIdsNoFilter(allGroups, lastToggledIds);
  }

  const missing = selectedGroupIds.filter(
    (id) => !ids.includes(id) && allGroups.some((g) => g.id === id),
  );
  if (missing.length > 0) {
    return [...ids, ...missing];
  }
  return ids;
}

export function semanticSearchPersonGroupsShouldOfferShowAll(args: {
  allGroups: readonly PersonGroupListMeta[];
  nameFilterTrimmed: string;
  groupsListExpanded: boolean;
  lastToggledIds: readonly string[];
}): boolean {
  if (args.groupsListExpanded || args.nameFilterTrimmed.trim().length > 0) {
    return false;
  }
  const visible = getSemanticSearchVisiblePersonGroupIds({
    allGroups: args.allGroups,
    nameFilterTrimmed: "",
    groupsListExpanded: false,
    lastToggledIds: args.lastToggledIds,
    selectedGroupIds: [],
  });
  return args.allGroups.length > visible.length;
}
