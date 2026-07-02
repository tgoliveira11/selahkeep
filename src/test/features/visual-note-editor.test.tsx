import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VisualNoteEditor } from "@/features/notes/visual-note-editor";

describe("VisualNoteEditor", () => {
  it("renders visual editor canvas", () => {
    render(<VisualNoteEditor value="" onChange={vi.fn()} id="visual-test" />);
    expect(screen.getByTestId("visual-note-editor-shell")).toBeTruthy();
    expect(screen.getByTestId("visual-note-editor")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Note body" })).toBeTruthy();
  });

  it("calls onSave for Cmd+S", () => {
    const onSave = vi.fn();
    render(<VisualNoteEditor value="" onChange={vi.fn()} onSave={onSave} id="visual-save" />);
    const editor = screen.getByTestId("visual-note-editor");
    fireEvent.keyDown(editor, { key: "s", metaKey: true });
    expect(onSave).toHaveBeenCalled();
  });

  it("renders checklist items with label and text in the same row", async () => {
    const { container } = render(
      <VisualNoteEditor
        value={"- [ ] Task one\n- [x] Task two"}
        onChange={vi.fn()}
        id="visual-checklist"
      />
    );

    await waitFor(() => {
      const items = container.querySelectorAll('li[data-type="taskItem"], li[data-checked]');
      expect(items.length).toBeGreaterThanOrEqual(2);
    });

    const first = container.querySelector('li[data-type="taskItem"], li[data-checked]');
    expect(first?.querySelector("label")).toBeTruthy();
    expect(first?.querySelector("div")?.textContent).toContain("Task one");
  });
});
