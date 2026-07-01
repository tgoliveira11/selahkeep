import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MarkdownEditor } from "@/features/notes/markdown-editor";
import { EditorQuickInsert } from "@/components/notes/editor-quick-insert";
import { EditorStatusBar } from "@/components/notes/editor-status-bar";
import { NoteFocusModeToggle } from "@/features/notes/note-focus-mode-toggle";
import { NewNoteAction } from "@/features/notes/new-note-action";
import { findDailyNoteIdForDate } from "@/lib/notes/daily-note";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })),
}));

describe("editor track 2 components", () => {
  it("defaults to visual editor", () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} />);
    expect(screen.getByTestId("visual-note-editor")).toBeTruthy();
    expect(screen.getByTestId("editor-status-mode")).toHaveTextContent("Visual editor");
  });

  it("shows save-failed status", () => {
    render(<EditorStatusBar status="save-failed" mode="visual" />);
    expect(screen.getByTestId("editor-status-message")).toHaveTextContent("Autosave failed");
  });

  it("shows draft-saved status", () => {
    render(<EditorStatusBar status="draft-saved" mode="visual" />);
    expect(screen.getByTestId("editor-status-message")).toHaveTextContent(
      "Draft saved on this device"
    );
  });

  it("quick insert menu exposes required items", () => {
    const onSelect = vi.fn();
    render(<EditorQuickInsert onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId("toolbar-quick-insert"));
    fireEvent.click(screen.getByTestId("quick-insert-prayer-section"));
    expect(onSelect).toHaveBeenCalledWith("prayer-section");
  });

  it("focus mode toggle reports pressed state", () => {
    const onToggle = vi.fn();
    render(<NoteFocusModeToggle active={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByTestId("note-focus-mode-toggle"));
    expect(onToggle).toHaveBeenCalled();
  });
});

describe("daily note action", () => {
  // Do not render NotesPage under vi.useFakeTimers(): vault/list effects schedule
  // real timers and stall the worker until the heap is exhausted.
  it("routes to an existing daily note id from the vault index", () => {
    const entries = [
      {
        id: "daily-1",
        title: "Daily note — 2026-06-16",
        categoryId: null,
        tagIds: [],
        answered: false,
        pinned: false,
        favorite: false,
        archived: false,
        trashed: false,
        trashedAt: null,
        createdAt: "2026-06-16T08:00:00.000Z",
        updatedAt: "2026-06-16T08:00:00.000Z",
      },
    ];
    const date = new Date("2026-06-16T12:00:00.000Z");

    expect(findDailyNoteIdForDate(entries, date)).toBe("daily-1");
  });

  it("invokes the daily note handler from the new note menu", () => {
    const onDailyNote = vi.fn();
    render(<NewNoteAction onDailyNote={onDailyNote} />);

    fireEvent.click(screen.getByTestId("new-note-action"));
    fireEvent.click(screen.getByTestId("new-daily-note"));

    expect(onDailyNote).toHaveBeenCalledTimes(1);
  });
});
