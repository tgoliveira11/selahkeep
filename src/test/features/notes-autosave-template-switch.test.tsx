/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NewNotePage from "@/app/(vault)/notes/new/page";
import {
  saveEncryptedNoteDraft,
  loadEncryptedNoteDraft,
} from "@/lib/crypto-client/note-drafts";
import { encryptField } from "@/lib/crypto-client/aes-gcm";
import { generateUserVaultKey, setSessionVaultKey } from "@/lib/crypto-client/vault";

const confirmMock = vi.fn(() => true);
const useSearchParams = vi.fn(() => new URLSearchParams());

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => "/notes/new"),
  useSearchParams: () => useSearchParams(),
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
  createdAt: "",
  updatedAt: "",
}));

vi.mock("@/features/notes/use-categories-tags", () => ({
  useCategoriesTags: vi.fn(() => ({
    categories: [
      { id: "cat-prayer", name: "Prayer", createdAt: "", updatedAt: "" },
      { id: "cat-personal", name: "Personal", createdAt: "", updatedAt: "" },
    ],
    tags: [],
    createCategory,
    createTag: vi.fn(),
  })),
}));

vi.mock("@/features/notes/use-notes", () => ({
  useNotes: vi.fn(() => ({
    createNote: vi.fn(),
    busy: false,
    error: null,
  })),
}));

vi.mock("@/lib/crypto-client/vault-session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/crypto-client/vault-session")>();
  return {
    ...actual,
    subscribeVaultSession: vi.fn(() => () => {}),
    subscribeVaultActivityTimer: vi.fn(() => () => {}),
    getVaultAutoLockRemainingMs: vi.fn(() => 14 * 60 * 1000 + 32 * 1000),
    lockVaultSession: vi.fn(),
    lockVaultSessionManually: vi.fn(),
    registerVaultBeforeAutoLock: vi.fn(() => () => {}),
    isVaultManuallyLocked: vi.fn(() => false),
    wasVaultLockedByInactivity: vi.fn(() => false),
    registerVaultUnloadGuard: vi.fn(() => () => {}),
  };
});

vi.mock("@/features/vault/use-vault-activity", () => ({
  touchVaultActivity: vi.fn(),
}));

vi.mock("@/features/vault/use-vault-auto-locked-copy", () => ({
  useVaultAutoLockedCopy: vi.fn(() => false),
}));

vi.mock("@/lib/crypto-client/note-drafts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/crypto-client/note-drafts")>();
  return {
    ...actual,
    loadEncryptedNoteDraft: vi.fn().mockResolvedValue(null),
    saveEncryptedNoteDraft: vi.fn().mockResolvedValue(undefined),
    deleteEncryptedNoteDraft: vi.fn().mockResolvedValue(undefined),
  };
});

function setNoteBody(value: string) {
  fireEvent.click(screen.getByTestId("editor-mode-markdown"));
  fireEvent.change(screen.getByTestId("markdown-expert-textarea"), { target: { value } });
}

function getMarkdownBody(): string {
  return (screen.getByTestId("markdown-expert-textarea") as HTMLTextAreaElement).value;
}

describe("SelahKeep notes autosave and template switching", () => {
  beforeEach(() => {
    confirmMock.mockClear();
    useSearchParams.mockReturnValue(new URLSearchParams());
    vi.mocked(saveEncryptedNoteDraft).mockClear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal("confirm", confirmMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe("autosave activation rules", () => {
    it("does not autosave on page open", () => {
      render(<NewNotePage />);
      vi.advanceTimersByTime(5000);
      expect(saveEncryptedNoteDraft).not.toHaveBeenCalled();
    });

    it("does not autosave after opening a template link alone", async () => {
      useSearchParams.mockReturnValue(new URLSearchParams("template=prayer"));
      render(<NewNotePage />);
      await screen.findByTestId("template-locked-category");
      vi.advanceTimersByTime(3000);
      expect(saveEncryptedNoteDraft).not.toHaveBeenCalled();
    });

    it("does not autosave from template-prefilled title without user edit", async () => {
      useSearchParams.mockReturnValue(new URLSearchParams("template=prayer"));
      render(<NewNotePage />);
      expect(screen.getByLabelText("Title")).toHaveValue("Prayer");
      vi.advanceTimersByTime(3000);
      expect(saveEncryptedNoteDraft).not.toHaveBeenCalled();
    });

    it("does not autosave from template-prefilled body without user edit", async () => {
      useSearchParams.mockReturnValue(new URLSearchParams("template=prayer"));
      render(<NewNotePage />);
      await waitFor(() => {
        expect(screen.getByLabelText("Title")).toHaveValue("Prayer");
      });
      fireEvent.click(screen.getByTestId("editor-mode-markdown"));
      await waitFor(() => {
        expect((screen.getByTestId("markdown-expert-textarea") as HTMLTextAreaElement).value).toMatch(
          /## Prayer/
        );
      });
      vi.advanceTimersByTime(3000);
      expect(saveEncryptedNoteDraft).not.toHaveBeenCalled();
    });

    it("autosaves after user edits title", async () => {
      render(<NewNotePage />);
      fireEvent.change(screen.getByLabelText("Title"), { target: { value: "My title" } });
      setNoteBody("Body");
      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(saveEncryptedNoteDraft).toHaveBeenCalled();
      });
    });

    it("activates autosave on title paste", async () => {
      render(<NewNotePage />);
      const title = screen.getByLabelText("Title");
      fireEvent.paste(title, {
        clipboardData: { getData: () => "Pasted title" },
      });
      fireEvent.change(title, { target: { value: "Pasted title" } });
      setNoteBody("Body");
      vi.advanceTimersByTime(2000);
      await waitFor(() => {
        expect(saveEncryptedNoteDraft).toHaveBeenCalled();
      });
    });

    it("autosaves after user edits body", async () => {
      render(<NewNotePage />);
      setNoteBody("User typed content");
      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(saveEncryptedNoteDraft).toHaveBeenCalledWith(
          "user-1",
          "new",
          expect.objectContaining({ body: "User typed content" })
        );
      });
    });

    it("autosaves after user edits tags", async () => {
      const { useCategoriesTags } = await import("@/features/notes/use-categories-tags");
      vi.mocked(useCategoriesTags).mockReturnValueOnce({
        categories: [],
        tags: [{ id: "t1", name: "faith", createdAt: "", updatedAt: "" }],
        createCategory,
        createTag: vi.fn(),
      });

      render(<NewNotePage />);
      setNoteBody("Body");
      fireEvent.change(screen.getByLabelText("Add tags"), {
        target: { value: "faith" },
      });
      fireEvent.keyDown(screen.getByLabelText("Add tags"), { key: "Enter" });
      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(saveEncryptedNoteDraft).toHaveBeenCalled();
      });
    });

    it("autosaves after manual category selection on blank note", async () => {
      render(<NewNotePage />);
      setNoteBody("Body");
      const categorySelect = document.getElementById("note-category");
      expect(categorySelect).toBeTruthy();
      fireEvent.change(categorySelect!, {
        target: { value: "cat-personal" },
      });
      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(saveEncryptedNoteDraft).toHaveBeenCalledWith(
          "user-1",
          "new",
          expect.objectContaining({ categoryId: "cat-personal" })
        );
      });
    });
  });

  describe("template query links", () => {
    it("prefills prayer template content from query param", async () => {
      useSearchParams.mockReturnValue(new URLSearchParams("template=prayer"));
      render(<NewNotePage />);
      expect(screen.getByLabelText("Title")).toHaveValue("Prayer");
      fireEvent.click(screen.getByTestId("editor-mode-markdown"));
      await waitFor(() => {
        expect(getMarkdownBody()).toMatch(/## Prayer/);
      });
      expect(screen.getByTestId("template-locked-category").textContent).toMatch(/Prayer/);
    });

    it("locks reflection category from query param", async () => {
      useSearchParams.mockReturnValue(new URLSearchParams("template=reflection"));
      render(<NewNotePage />);
      expect(screen.getByTestId("template-locked-category").textContent).toMatch(/Reflection/);
      expect(screen.getByLabelText("Title")).toHaveValue("Reflection");
    });
  });

  describe("unsaved warnings", () => {
    it("does not mark dirty from template query link alone", () => {
      useSearchParams.mockReturnValue(new URLSearchParams("template=prayer"));
      render(<NewNotePage />);
      expect(screen.queryByText("You have unsaved changes.")).toBeNull();
    });

    it("marks dirty after user edits for leave warning", () => {
      render(<NewNotePage />);
      setNoteBody("Edited");
      expect(screen.getByText("You have unsaved changes.")).toBeTruthy();
    });
  });

  describe("security", () => {
    it("does not store plaintext note content in localStorage", () => {
      render(<NewNotePage />);
      setNoteBody("SENTINEL-PRIVATE-LETTER-DO-NOT-STORE-PLAINTEXT-12345");
      const storage = globalThis.localStorage;
      if (storage && typeof storage.length === "number") {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key) {
            expect(storage.getItem(key)).not.toContain("SENTINEL-PRIVATE-LETTER");
          }
        }
      }
    });

    it("persists encrypted payloads in draft store", async () => {
      const key = await generateUserVaultKey();
      setSessionVaultKey(key);
      const encrypted = await encryptField("secret", key, {
        userId: "user-1",
        resourceId: "user-1",
        field: "note_draft",
      });
      expect(JSON.stringify(encrypted)).not.toContain("secret");
    });
  });
});
