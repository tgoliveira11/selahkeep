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

  it("round-trips a hard line break without leaking a literal backslash", async () => {
    const value = "Line one\\\nLine two";
    const onChange = vi.fn();
    const { container } = render(
      <VisualNoteEditor value={value} onChange={onChange} id="visual-linebreak" />
    );

    await waitFor(() => {
      expect(container.querySelector("p br")).toBeTruthy();
    });

    const paragraph = container.querySelector("p");
    expect(paragraph?.textContent).toBe("Line oneLine two");
    expect(container.textContent).not.toContain("\\n");
    expect(container.textContent).not.toContain("\\");
  });

  it("re-serializes a loaded hard line break back to the same markdown", async () => {
    const value = "Line one\\\nLine two";
    let editorInstance: import("@tiptap/react").Editor | null = null;
    render(
      <VisualNoteEditor
        value={value}
        onChange={vi.fn()}
        id="visual-linebreak-roundtrip"
        onEditorReady={(editor) => {
          editorInstance = editor;
        }}
      />
    );

    await waitFor(() => expect(editorInstance).toBeTruthy());
    const resaved: string = editorInstance!.storage.markdown.getMarkdown();
    expect(resaved).toBe(value);
  });

  it("normalizes a bare newline (raw markdown mode's Enter) into a hard break on reload", async () => {
    // Markdown/raw mode's plain Enter inserts a bare "\n" (no backslash) —
    // different from the visual editor's own hardBreak serialization.
    const value = "Line one\nLine two";
    let editorInstance: import("@tiptap/react").Editor | null = null;
    const { container } = render(
      <VisualNoteEditor
        value={value}
        onChange={vi.fn()}
        id="visual-bare-newline"
        onEditorReady={(editor) => {
          editorInstance = editor;
        }}
      />
    );

    await waitFor(() => expect(container.querySelector("p br")).toBeTruthy());
    const resaved: string = editorInstance!.storage.markdown.getMarkdown();
    expect(resaved).toBe("Line one\\\nLine two");
    expect(container.textContent).not.toContain("\\");
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
