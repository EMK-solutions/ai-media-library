// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { SmartAlbumFilters } from "@emk/shared-contracts";
import { BestOfPersonPeopleFiltersPanel } from "./BestOfPersonPeopleFiltersPanel";

const EMPTY_FILTERS: SmartAlbumFilters = {
  includeUnconfirmedFaces: true,
  ratingLogic: "or",
};

describe("BestOfPersonPeopleFiltersPanel", () => {
  it("invokes onClear when Clear filters is clicked", () => {
    const onClear = vi.fn();
    render(
      <BestOfPersonPeopleFiltersPanel
        filters={EMPTY_FILTERS}
        selectedPersonTagIds={[]}
        personTags={[]}
        resetKey={0}
        onClose={vi.fn()}
        onClear={onClear}
        onFiltersChange={vi.fn()}
        onTogglePersonTag={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
