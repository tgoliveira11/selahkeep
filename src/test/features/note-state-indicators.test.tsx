import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })),
}));

import { NoteStateIndicators } from "@/components/notes/note-state-indicators";
import { NoteCard } from "@/components/notes/note-card";
import { NoteListRow } from "@/components/notes/note-list-row";

describe("NoteStateIndicators fixed slots", () => {
  it("renders pinned, favorite, and resolved slots in order", () => {
    render(
      <NoteStateIndicators answered pinned favorite archived={false} trashed={false} />
    );
    const core = screen.getByTestId("note-state-indicators-core");
    const slots = within(core).getAllByTestId(/note-(pinned|favorite|resolved|unresolved)/);
    expect(slots.map((slot) => slot.getAttribute("data-testid"))).toEqual([
      "note-pinned-badge",
      "note-favorite-badge",
      "note-resolved-indicator",
    ]);
  });

  it("keeps unresolved in the third slot when not pinned or favorite", () => {
    render(<NoteStateIndicators answered={false} archived={false} trashed={false} />);
    const core = screen.getByTestId("note-state-indicators-core");
    expect(within(core).getByTestId("note-pinned-slot")).toBeTruthy();
    expect(within(core).getByTestId("note-favorite-slot")).toBeTruthy();
    expect(within(core).getByTestId("note-unresolved-indicator")).toBeTruthy();
  });

  it("shows archived lifecycle without removing core slots", () => {
    render(<NoteStateIndicators answered archived trashed={false} />);
    expect(screen.getByTestId("note-archived-badge")).toBeTruthy();
    expect(screen.getByTestId("note-state-indicators-core")).toBeTruthy();
  });

  it("card indicators sit outside the navigation link", () => {
    render(
      <NoteCard
        id="n1"
        title="Prayer note"
        answered={false}
        pinned
        createdAt="2026-01-01T00:00:00.000Z"
        updatedAt="2026-01-02T00:00:00.000Z"
      />
    );
    const link = screen.getByRole("link", { name: /prayer note/i });
    expect(within(link).queryByTestId("note-state-indicators")).toBeNull();
    expect(screen.getByTestId("note-state-indicators")).toBeTruthy();
  });

  it("list title link navigates while indicators stay separate", () => {
    render(
      <NoteListRow
        id="n1"
        title="List note"
        answered={false}
        favorite
        createdAt="2026-01-01T00:00:00.000Z"
        updatedAt="2026-01-02T00:00:00.000Z"
        categoryName="Prayer"
      />
    );
    expect(screen.getByRole("link", { name: /open note: list note/i })).toHaveAttribute(
      "href",
      "/notes/n1"
    );
    expect(screen.getByLabelText("Favorite note")).toBeTruthy();
  });
});
