/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import NewNotePage from "@/app/(vault)/notes/new/page";
import { saveEncryptedNoteDraft } from "@/lib/crypto-client/note-drafts";
import { RESERVED_CATEGORY_MESSAGE } from "@/lib/notes/reserved-category-names";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => "/notes/new"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
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

const createNote = vi.fn().mockResolvedValue({ id: "note-new" });

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
    createNote,
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

vi.mock("@/lib/crypto-client/note-drafts", () => ({
  NEW_NOTE_DRAFT_KEY: "new",
  loadEncryptedNoteDraft: vi.fn().mockResolvedValue(null),
  saveEncryptedNoteDraft: vi.fn().mockResolvedValue(undefined),
  deleteEncryptedNoteDraft: vi.fn().mockResolvedValue(undefined),
}));

function sectionOrder() {
  const title = screen.getByTestId("new-note-title-field");
  const category = screen.queryByTestId("new-note-category-section");
  const template = screen.getByTestId("new-note-template-section");
  const editor = screen.getByTestId("new-note-editor-field");
  const attachments = screen.getByTestId("new-note-attachments-field");
  const tags = screen.getByTestId("new-note-tags-field");

  const before = (a: Element, b: Element) =>
    Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

  // Mockup order: title → category → template → editor → attachments → tags.
  return {
    titleBeforeTemplate: before(title, template),
    templateBeforeEditor: before(template, editor),
    editorBeforeAttachments: before(editor, attachments),
    attachmentsBeforeTags: before(attachments, tags),
    titleBeforeCategory: category ? before(title, category) : null,
    categoryBeforeTemplate: category ? before(category, template) : null,
  };
}

function setNoteBody(value: string) {
  fireEvent.click(screen.getByTestId("editor-mode-markdown"));
  fireEvent.change(screen.getByTestId("markdown-expert-textarea"), { target: { value } });
}

describe("SelahKeep /notes/new field order and template categories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe("field order", () => {
    it("orders title first, then template, editor, attachments, and tags", () => {
      render(<NewNotePage />);
      const order = sectionOrder();
      expect(order.titleBeforeTemplate).toBe(true);
      expect(order.templateBeforeEditor).toBe(true);
      expect(order.editorBeforeAttachments).toBe(true);
      expect(order.attachmentsBeforeTags).toBe(true);
    });

    it("orders category after title and before template for blank note", () => {
      render(<NewNotePage />);
      const order = sectionOrder();
      expect(order.titleBeforeCategory).toBe(true);
      expect(order.categoryBeforeTemplate).toBe(true);
    });

    it("groups template and dictate inside the editor rail (desktop right column)", () => {
      render(<NewNotePage />);
      const rail = screen.getByTestId("new-note-rail");
      // Template + dictate live in the rail; the editor body stays in the main column.
      expect(within(rail).getByTestId("new-note-template-section")).toBeInTheDocument();
      expect(within(rail).getByTestId("new-note-dictate")).toBeInTheDocument();
      expect(within(rail).queryByTestId("new-note-editor-field")).toBeNull();
    });
  });

  describe("template category behavior", () => {
    it("hides manual category controls for Prayer template", async () => {
      render(<NewNotePage />);
      fireEvent.click(screen.getByRole("radio", { name: /^prayer$/i }));

      expect(screen.getByTestId("template-locked-category")).toBeTruthy();
      expect(screen.queryByRole("combobox", { name: /^category$/i })).toBeNull();
      expect(screen.queryByPlaceholderText(/new category name/i)).toBeNull();
    });

    it("does not create template category on selection", async () => {
      render(<NewNotePage />);
      fireEvent.click(screen.getByRole("radio", { name: /^prayer$/i }));
      await waitFor(() => {
        expect(screen.getByTestId("template-locked-category")).toBeTruthy();
      });
      expect(createCategory).not.toHaveBeenCalled();
    });

    it("reuses existing template category on save without creating", async () => {
      render(<NewNotePage />);
      fireEvent.click(screen.getByRole("radio", { name: /^prayer$/i }));
      setNoteBody("My prayer");
      fireEvent.click(screen.getByRole("button", { name: /save note/i }));

      await waitFor(() => {
        expect(createCategory).not.toHaveBeenCalled();
        expect(createNote).toHaveBeenCalledWith(
          expect.objectContaining({ title: "Prayer", categoryId: "cat-prayer" })
        );
      });
    });

    it("creates template category on save when missing", async () => {
      const { useCategoriesTags } = await import("@/features/notes/use-categories-tags");
      vi.mocked(useCategoriesTags).mockReturnValueOnce({
        categories: [{ id: "cat-personal", name: "Personal", createdAt: "", updatedAt: "" }],
        tags: [],
        createCategory,
        createTag: vi.fn(),
      });

      render(<NewNotePage />);
      fireEvent.click(screen.getByRole("radio", { name: /^reflection$/i }));
      setNoteBody("Reflecting");
      fireEvent.click(screen.getByRole("button", { name: /save note/i }));

      await waitFor(() => {
        expect(createCategory).toHaveBeenCalledWith("Reflection");
      });
    });

    it("restores manual category controls when switching to Blank note", async () => {
      render(<NewNotePage />);
      fireEvent.click(screen.getByRole("radio", { name: /^prayer$/i }));
      await waitFor(() => expect(screen.getByTestId("template-locked-category")).toBeTruthy());

      fireEvent.click(screen.getByRole("radio", { name: /blank note/i }));
      expect(screen.queryByTestId("template-locked-category")).toBeNull();
      expect(screen.getByRole("combobox", { name: /^category$/i })).toBeTruthy();
    });
  });

  describe("blank note category behavior", () => {
    it("lists only user-created categories in manual dropdown", () => {
      render(<NewNotePage />);
      const select = screen.getByRole("combobox", { name: /^category$/i }) as HTMLSelectElement;
      const options = within(select)
        .getAllByRole("option")
        .map((option) => option.textContent);
      expect(options).toContain("Personal");
      expect(options).not.toContain("Prayer");
    });

    it("blocks reserved category names on create", async () => {
      render(<NewNotePage />);
      fireEvent.change(screen.getByPlaceholderText(/new category name/i), {
        target: { value: "prayer" },
      });
      fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(RESERVED_CATEGORY_MESSAGE);
      expect(createCategory).not.toHaveBeenCalled();
    });

    it("allows creating a normal custom category", async () => {
      render(<NewNotePage />);
      fireEvent.change(screen.getByPlaceholderText(/new category name/i), {
        target: { value: "Family" },
      });
      fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

      await waitFor(() => {
        expect(createCategory).toHaveBeenCalledWith("Family");
      });
    });
  });

  describe("autosave and dirty state", () => {
    it("does not autosave after template selection alone", async () => {
      render(<NewNotePage />);
      fireEvent.click(screen.getByRole("radio", { name: /^prayer$/i }));
      vi.advanceTimersByTime(3000);
      expect(saveEncryptedNoteDraft).not.toHaveBeenCalled();
    });

    it("autosaves after user edits body", async () => {
      render(<NewNotePage />);
      setNoteBody("User typed this");
      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(saveEncryptedNoteDraft).toHaveBeenCalled();
      });
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
  });
});
