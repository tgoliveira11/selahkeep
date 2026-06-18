/** @vitest-environment happy-dom */
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
  });

  it("switches to markdown expert mode with textarea and preview", () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="# Hello" onChange={onChange} id="test-md" />);
    switchToMarkdownMode();
    expect(screen.getByTestId("markdown-expert-textarea")).toBeTruthy();
    expect(screen.getByText("Preview")).toBeTruthy();
    expect(screen.queryByTestId("visual-note-editor")).toBeNull();
  });

  it("shows conversion warning when switching to visual with unsupported markdown", () => {
    render(<MarkdownEditor value="### heading" onChange={vi.fn()} id="test-md" />);
    switchToMarkdownMode();
    fireEvent.click(screen.getByTestId("editor-mode-visual"));
    expect(screen.getByTestId("editor-conversion-warning")).toBeTruthy();
  });

  it("applies bold formatting via toolbar in markdown mode", () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="word" onChange={onChange} id="test-md-bold" />);
    switchToMarkdownMode();
    const textarea = document.getElementById("test-md-bold") as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 4);
    fireEvent.click(screen.getByRole("button", { name: "Bold" }));
    expect(onChange).toHaveBeenCalledWith("**word**");
  });

  it("applies code formatting via toolbar in markdown mode", () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="code" onChange={onChange} id="test-md-code" />);
    switchToMarkdownMode();
    const textarea = document.getElementById("test-md-code") as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 4);
    fireEvent.click(screen.getByRole("button", { name: "Code" }));
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

  it("renders all toolbar actions including Code", () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} />);
    for (const label of ["Bold", "Italic", "H1", "H2", "Quote", "List", "Checklist", "Link", "Code"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
  });
});
