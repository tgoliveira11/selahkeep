/** @vitest-environment happy-dom */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  NoteFilters,
  defaultNoteFilters,
} from "@/features/notes/note-filters";

describe("note filters UI", () => {
  it("updates search and answered filter", () => {
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

    fireEvent.change(screen.getByLabelText(/answered/i), { target: { value: "answered" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...defaultNoteFilters, answered: "answered" });
  });
});
