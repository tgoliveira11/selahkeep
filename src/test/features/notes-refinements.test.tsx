/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NewNotePage from "@/app/(vault)/notes/new/page";
import NotesPage from "@/app/(vault)/notes/page";
import { saveEncryptedNoteDraft } from "@/lib/crypto-client/note-drafts";

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

const createCategory = vi.fn(async (name: string) => ({
  id: `cat-${name.toLowerCase().replace(/\s+/g, "-")}`,
  name,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}));

vi.mock("@/features/notes/use-categories-tags", () => ({
  useCategoriesTags: vi.fn(() => ({
    categories: [],
    tags: [],
    createCategory,
    createTag: vi.fn(),
  })),
}));

vi.mock("@/features/notes/use-notes", () => ({
  useNotes: vi.fn(() => ({
    createNote: vi.fn(),
    toggleNoteResolved: vi.fn(),
    busy: false,
    error: null,
  })),
}));

const useVaultIndexMock = vi.fn(() => ({
  index: {
    categories: [],
    tags: [],
    entries: [
      {
        id: "n1",
        title: "Only note",
        categoryId: null,
        tagIds: [],
        answered: false,
        pinned: false,
        favorite: false,
        archived: false,
        trashed: false,
        trashedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    ],
    savedViews: [],
    version: 3,
  },
  loading: false,
  error: null,
  mutateIndex: vi.fn(),
}));

vi.mock("@/features/notes/use-vault-index", () => ({
  useVaultIndex: (...args: unknown[]) => useVaultIndexMock(...args),
}));

vi.mock("@/lib/crypto-client/vault-session", () => ({
  subscribeVaultSession: vi.fn(() => () => {}),
  registerVaultBeforeAutoLock: vi.fn(() => () => {}),
}));

vi.mock("@/features/vault/use-vault-activity", () => ({
  touchVaultActivity: vi.fn(),
}));

vi.mock("@/features/vault/use-vault-auto-locked-copy", () => ({
  useVaultAutoLockedCopy: vi.fn(() => false),
}));

vi.mock("@/lib/crypto-client/note-drafts", () => ({
  NEW_NOTE_DRAFT_KEY: "new",
  loadEncryptedNoteDraft: vi.fn().mockResolvedValue(null),
  saveEncryptedNoteDraft: vi.fn().mockResolvedValue(undefined),
  deleteEncryptedNoteDraft: vi.fn().mockResolvedValue(undefined),
  listEncryptedNoteDraftKeys: vi.fn().mockResolvedValue([]),
}));

describe("notes refinements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe("template category", () => {
    it("shows locked Prayer category when Prayer template is selected", async () => {
      render(<NewNotePage />);
      fireEvent.click(screen.getByRole("radio", { name: /^prayer$/i }));

      const locked = await screen.findByTestId("template-locked-category");
      expect(locked.textContent).toMatch(/Prayer/);
      expect(locked.textContent).toMatch(/assigned automatically/i);
    });

    it("does not create category when Prayer template is selected", async () => {
      render(<NewNotePage />);
      fireEvent.click(screen.getByRole("radio", { name: /^prayer$/i }));
      await screen.findByTestId("template-locked-category");
      expect(createCategory).not.toHaveBeenCalled();
    });

    it("does not autosave after template selection alone", async () => {
      render(<NewNotePage />);
      fireEvent.click(screen.getByRole("radio", { name: /^prayer$/i }));
      await screen.findByTestId("template-locked-category");

      vi.advanceTimersByTime(3000);
      expect(saveEncryptedNoteDraft).not.toHaveBeenCalled();
    });

    it("starts autosave after user edits body", async () => {
      render(<NewNotePage />);
      fireEvent.click(screen.getByRole("radio", { name: /^prayer$/i }));
      await screen.findByTestId("template-locked-category");

      fireEvent.click(screen.getByTestId("editor-mode-markdown"));
      fireEvent.change(screen.getByTestId("markdown-expert-textarea"), { target: { value: "extra" } });

      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(saveEncryptedNoteDraft).toHaveBeenCalled();
      });
    });

    it("restores normal category behavior for Blank note", async () => {
      render(<NewNotePage />);
      fireEvent.click(screen.getByRole("radio", { name: /^prayer$/i }));
      await waitFor(() => expect(screen.getByTestId("template-locked-category")).toBeTruthy());

      fireEvent.click(screen.getByRole("radio", { name: /blank note/i }));
      expect(screen.queryByTestId("template-locked-category")).toBeNull();
      expect(screen.getByPlaceholderText(/new category name/i)).toBeTruthy();
    });
  });

  describe("/notes controls region", () => {
    it("shows compact controls when there is one note without organizers", () => {
      render(<NotesPage />);
      expect(screen.getByTestId("notes-list-controls")).toBeTruthy();
      expect(screen.getByTestId("notes-counter")).toBeTruthy();
      expect(screen.getByTestId("note-sort-menu")).toBeTruthy();
      expect(screen.getByTestId("smart-filter-chips")).toBeTruthy();
      expect(screen.queryByTestId("saved-view-select")).toBeNull();
      expect(screen.getByTestId("saved-views-menu")).toBeTruthy();
      expect(screen.queryByTestId("note-filters-embedded")).toBeNull();
    });

    it("shows unified controls when organizers exist", () => {
      useVaultIndexMock.mockReturnValueOnce({
        index: {
          categories: [{ id: "c1", name: "Prayer", createdAt: "", updatedAt: "" }],
          tags: [],
          entries: [
            {
              id: "n1",
              title: "Prayer note",
              categoryId: "c1",
              tagIds: [],
              answered: false,
              pinned: false,
              favorite: false,
              archived: false,
              trashed: false,
              trashedAt: null,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-02T00:00:00.000Z",
            },
          ],
          savedViews: [],
          version: 3,
        },
        loading: false,
        error: null,
        mutateIndex: vi.fn(),
      });

      render(<NotesPage />);
      expect(screen.getByTestId("notes-list-controls")).toBeTruthy();
      expect(screen.getByTestId("notes-counter")).toBeTruthy();
      expect(screen.getByTestId("note-sort-menu")).toBeTruthy();
      fireEvent.click(screen.getByTestId("advanced-filters-menu"));
      expect(screen.getByTestId("advanced-note-filters")).toBeTruthy();
    });
  });
});
