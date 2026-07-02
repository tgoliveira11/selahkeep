import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkdownEditor } from "@/features/notes/markdown-editor";

function switchToMarkdownMode() {
  fireEvent.click(screen.getByTestId("editor-mode-markdown"));
}

describe("MarkdownEditor", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to visual mode without markdown preview", () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="# Hello" onChange={onChange} id="test-md" />);
    expect(screen.getByTestId("visual-note-editor")).toBeTruthy();
    expect(screen.queryByText("Preview")).toBeNull();
    expect(screen.queryByTestId("markdown-expert-textarea")).toBeNull();
    expect(screen.getByTestId("note-editor-toolbar")).toBeTruthy();
  });

  it("shows editor status bar with visual mode label", () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} status="unsaved" />);
    expect(screen.getByTestId("editor-status-bar")).toBeTruthy();
    expect(screen.getByTestId("editor-status-mode")).toHaveTextContent("Visual editor");
    expect(screen.getByTestId("editor-status-message")).toHaveTextContent("Unsaved changes");
  });

  it("switches to markdown expert mode with textarea and collapsible preview", () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="# Hello" onChange={onChange} id="test-md" />);
    switchToMarkdownMode();
    expect(screen.getByTestId("markdown-expert-textarea")).toBeTruthy();
    expect(screen.getByText("Preview")).toBeTruthy();
    expect(screen.queryByTestId("visual-note-editor")).toBeNull();
    expect(screen.getByTestId("editor-status-mode")).toHaveTextContent("Markdown source");
  });

  it("shows conversion warning when switching to visual with unsupported markdown", () => {
    render(<MarkdownEditor value="### heading" onChange={vi.fn()} id="test-md" />);
    switchToMarkdownMode();
    fireEvent.click(screen.getByTestId("editor-mode-markdown"));
    expect(screen.getByTestId("editor-conversion-warning")).toBeTruthy();
  });

  it("applies bold formatting via toolbar in markdown mode", () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="word" onChange={onChange} id="test-md-bold" />);
    switchToMarkdownMode();
    const textarea = document.getElementById("test-md-bold") as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 4);
    fireEvent.click(screen.getByTestId("toolbar-bold"));
    expect(onChange).toHaveBeenCalledWith("**word**");
  });

  it("applies code formatting via toolbar in markdown mode", () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="code" onChange={onChange} id="test-md-code" />);
    switchToMarkdownMode();
    const textarea = document.getElementById("test-md-code") as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 4);
    fireEvent.click(screen.getByTestId("toolbar-code"));
    expect(onChange).toHaveBeenCalledWith("`code`");
  });

  it("calls onSave for Cmd+S in markdown mode", () => {
    const onSave = vi.fn();
    render(<MarkdownEditor value="" onChange={vi.fn()} id="test-md-save" onSave={onSave} />);
    switchToMarkdownMode();
    const textarea = screen.getByTestId("markdown-expert-textarea");
    fireEvent.keyDown(textarea, { key: "s", metaKey: true });
    expect(onSave).toHaveBeenCalled();
  });

  it("toggles a checklist item from the markdown preview when checklists are not disabled", () => {
    // Kanban card descriptions stopped passing `checklistsDisabled` so they get
    // the same interactive checklist as notes — this guards that default.
    const onChange = vi.fn();
    render(<MarkdownEditor value="- [ ] task" onChange={onChange} id="test-md-checklist" />);
    switchToMarkdownMode();
    fireEvent.click(screen.getByText("Preview"));
    const checkbox = screen.getByTestId("markdown-expert-editor").querySelector("input[type=checkbox]");
    expect(checkbox).toBeTruthy();
    fireEvent.click(checkbox as HTMLInputElement);
    expect(onChange).toHaveBeenCalledWith("- [x] task");
  });

  it("renders grouped toolbar actions with accessible labels", () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} />);
    for (const label of ["Bold", "Italic", "H1", "H2", "Quote", "List", "Checklist", "Link", "Code"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
    expect(screen.getByRole("group", { name: "Headings" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Text formatting" })).toBeTruthy();
  });

  it("toolbar scroll container avoids page-level overflow class", () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} />);
    const toolbar = screen.getByTestId("note-editor-toolbar");
    expect(toolbar.querySelector(".note-editor-toolbar__scroll")).toBeTruthy();
  });
});
