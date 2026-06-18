/** @vitest-environment happy-dom */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkdownPreview } from "@/components/notes/markdown-preview";

describe("MarkdownPreview", () => {
  it("renders bold markdown as strong element", () => {
    render(<MarkdownPreview markdown="This is **bold**" />);
    const preview = screen.getByTestId("markdown-preview");
    expect(preview.querySelector("strong")?.textContent).toBe("bold");
  });

  it("renders list markdown as list elements", () => {
    render(<MarkdownPreview markdown={"- item 1\n- item 2"} />);
    const preview = screen.getByTestId("markdown-preview");
    expect(preview.querySelector("ul")).toBeTruthy();
    expect(preview.querySelectorAll("li")).toHaveLength(2);
  });

  it("does not show raw markdown markers for valid bold", () => {
    render(<MarkdownPreview markdown="**bold**" />);
    const preview = screen.getByTestId("markdown-preview");
    expect(preview.textContent?.trim()).toBe("bold");
    expect(preview.innerHTML).not.toContain("**");
  });

  it("sanitizes unsafe markdown", () => {
    render(<MarkdownPreview markdown={'<script>alert("xss")</script>'} />);
    const preview = screen.getByTestId("markdown-preview");
    expect(preview.innerHTML).not.toContain("<script");
  });

  it("shows empty message when markdown is blank", () => {
    render(<MarkdownPreview markdown="   " emptyMessage="Empty preview" />);
    expect(screen.getByText("Empty preview")).toBeTruthy();
  });

  it("toggles checklist items when interactive", () => {
    const onMarkdownChange = vi.fn();
    render(<MarkdownPreview markdown="- [ ] task" onMarkdownChange={onMarkdownChange} />);
    const checkbox = screen.getByTestId("markdown-preview").querySelector("input") as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    fireEvent.click(checkbox);
    expect(onMarkdownChange).toHaveBeenCalledWith("- [x] task");
  });

  it("does not render disabled checkboxes when interactive", () => {
    render(<MarkdownPreview markdown="- [ ] task" onMarkdownChange={vi.fn()} />);
    const checkbox = screen.getByTestId("markdown-preview").querySelector("input");
    expect(checkbox?.hasAttribute("disabled")).toBe(false);
  });
});
