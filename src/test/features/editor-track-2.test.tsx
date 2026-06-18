/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MarkdownEditor } from "@/features/notes/markdown-editor";
import { EditorQuickInsert } from "@/components/notes/editor-quick-insert";
import { EditorStatusBar } from "@/components/notes/editor-status-bar";
import { NoteFocusModeToggle } from "@/features/notes/note-focus-mode-toggle";
import NotesPage from "@/app/(vault)/notes/page";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => "/notes"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    data: { user: { id: "user-1" } },
    status: "authenticated",
  })),
}));

vi.mock("@/features/vault/use-require-vault", () => ({
  useRequireVault: vi.fn(() => ({
    status: "ready",
    userId: "user-1",
    vaultUnlocked: true,
    recheckVault: vi.fn(),
  })),
}));

vi.mock("@/features/vault/use-vault-client-status", () => ({
  useVaultClientStatus: vi.fn(() => ({
    status: "ready",
    clientStatus: "unlocked",
    setupPhase: "complete",
    serverStatus: { setupComplete: true },
    recheck: vi.fn(),
  })),
}));

vi.mock("@/features/notes/use-vault-index", () => ({
  useVaultIndex: vi.fn(() => ({
    index: {
      categories: [],
      tags: [],
      entries: [
        {
          id: "daily-1",
          title: "Daily note — 2026-06-16",
          categoryId: null,
          tagIds: [],
          answered: false,
          createdAt: "2026-06-16T08:00:00.000Z",
          updatedAt: "2026-06-16T08:00:00.000Z",
        },
      ],
    },
    loading: false,
    error: null,
    mutateIndex: vi.fn(),
  })),
}));

vi.mock("@/features/notes/use-notes", () => ({
  useNotes: vi.fn(() => ({
    toggleNoteResolved: vi.fn(),
  })),
}));

describe("editor track 2 components", () => {
  it("defaults to visual editor", () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} />);
    expect(screen.getByTestId("visual-note-editor")).toBeTruthy();
    expect(screen.getByTestId("editor-status-mode")).toHaveTextContent("Visual editor");
  });

  it("shows save-failed status", () => {
    render(<EditorStatusBar status="save-failed" mode="visual" />);
    expect(screen.getByTestId("editor-status-message")).toHaveTextContent("Save failed");
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
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-16T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows new daily note button on notes page", async () => {
    const { useRouter } = await import("next/navigation");
    const push = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      push,
      replace: vi.fn(),
      back: vi.fn(),
    } as ReturnType<typeof useRouter>);

    render(<NotesPage />);
    fireEvent.click(screen.getByTestId("new-daily-note"));
    expect(push).toHaveBeenCalledWith("/notes/daily-1");
  });
});
