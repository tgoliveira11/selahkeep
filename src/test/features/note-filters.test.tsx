/** @vitest-environment happy-dom */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  NoteFilters,
  defaultNoteFilters,
  hasNoteOrganizers,
} from "@/features/notes/note-filters";

describe("note filters UI", () => {
  it("updates search and resolved filter", () => {
    const onChange = vi.fn();
    render(
      <NoteFilters
        filters={defaultNoteFilters}
        categories={[{ id: "c1", name: "Prayer", createdAt: "", updatedAt: "" }]}
        tags={[{ id: "t1", name: "hope", createdAt: "", updatedAt: "" }]}
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByLabelText(/search/i), { target: { value: "morning" } });
    expect(onChange).toHaveBeenCalledWith({ ...defaultNoteFilters, search: "morning" });

    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: "resolved" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...defaultNoteFilters, resolved: "resolved" });
  });

  it("is hidden without categories or tags", () => {
    expect(hasNoteOrganizers([], [])).toBe(false);
  });
});
