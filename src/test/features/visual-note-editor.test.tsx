/** @vitest-environment happy-dom */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VisualNoteEditor } from "@/features/notes/visual-note-editor";

describe("VisualNoteEditor", () => {
  it("renders visual editor shell and toolbar", () => {
    render(<VisualNoteEditor value="" onChange={vi.fn()} id="visual-test" />);
    expect(screen.getByTestId("visual-note-editor-shell")).toBeTruthy();
    expect(screen.getByTestId("visual-note-editor")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Code" })).toBeTruthy();
  });

  it("calls onSave for Cmd+S", () => {
    const onSave = vi.fn();
    render(<VisualNoteEditor value="" onChange={vi.fn()} onSave={onSave} id="visual-save" />);
    const editor = screen.getByTestId("visual-note-editor");
    fireEvent.keyDown(editor, { key: "s", metaKey: true });
    expect(onSave).toHaveBeenCalled();
  });
});
