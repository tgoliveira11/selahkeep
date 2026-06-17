/** @vitest-environment happy-dom */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkdownEditor } from "@/features/notes/markdown-editor";

describe("MarkdownEditor", () => {
  it("renders textarea and preview", () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="# Hello" onChange={onChange} id="test-md" />);
    expect(screen.getByRole("textbox")).toBeTruthy();
    expect(screen.getByText("Preview")).toBeTruthy();
  });

  it("applies bold formatting via toolbar", () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="word" onChange={onChange} id="test-md-bold" />);
    const textarea = document.getElementById("test-md-bold") as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 4);
    fireEvent.click(screen.getByRole("button", { name: "Bold" }));
    expect(onChange).toHaveBeenCalledWith("**word**");
  });
});
