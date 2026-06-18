/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotesPage from "@/app/(vault)/notes/page";
import NewNotePage from "@/app/(vault)/notes/new/page";
import NoteDetailPage from "@/app/(vault)/notes/[id]/page";
import { TagChipInput } from "@/features/notes/tag-chip-input";
import { NoteCategoryLabel, NoteTagChip } from "@/components/notes/note-labels";
import { hasNoteOrganizers, NoteFilters } from "@/features/notes/note-filters";
import { encryptNote } from "@/lib/crypto-client/notes";
import { generateUserVaultKey, setSessionVaultKey } from "@/lib/crypto-client/vault";
import { USER_ID, NOTE_ID } from "@/test/helpers/fixtures";

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: routerPush, replace: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => "/notes"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({ id: NOTE_ID })),
}));

vi.mock("@/features/vault/use-require-vault", () => ({
  useRequireVault: vi.fn(),
}));

vi.mock("@/features/vault/use-vault-client-status", () => ({
  useVaultClientStatus: vi.fn(),
}));

vi.mock("@/features/notes/use-vault-index", () => ({
  useVaultIndex: vi.fn(),
}));

vi.mock("@/features/notes/use-notes", () => ({
  useNotes: vi.fn(),
}));

vi.mock("@/features/notes/use-categories-tags", () => ({
  useCategoriesTags: vi.fn(),
}));

vi.mock("@/lib/api-client/notes", () => ({
  notesApi: {
    get: vi.fn(),
  },
}));

vi.mock("@/lib/crypto-client/notes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/crypto-client/notes")>();
  return {
    ...actual,
    decryptNote: vi.fn(),
  };
});

vi.mock("@/lib/crypto-client/vault-session", () => ({
  subscribeVaultSession: vi.fn(() => () => {}),
  lockVaultSession: vi.fn(),
}));

vi.mock("@/lib/crypto-client/note-drafts", () => ({
  NEW_NOTE_DRAFT_KEY: "new",
  loadEncryptedNoteDraft: vi.fn().mockResolvedValue(null),
  saveEncryptedNoteDraft: vi.fn().mockResolvedValue(undefined),
  deleteEncryptedNoteDraft: vi.fn().mockResolvedValue(undefined),
}));

const sampleIndex = {
  version: 2 as const,
  categories: [{ id: "c1", name: "Prayer", createdAt: "", updatedAt: "" }],
  tags: [{ id: "t1", name: "faith", createdAt: "", updatedAt: "" }],
  entries: [
    {
      id: "note-1",
      title: "Morning prayer",
      categoryId: "c1",
      tagIds: ["t1"],
      answered: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

function mockVaultReady(unlocked: boolean) {
  return {
    status: "ready" as const,
    userId: USER_ID,
    vaultUnlocked: unlocked,
    recheckVault: vi.fn(),
  };
}

function mockClientStatus(
  clientStatus: "not_configured" | "setup_incomplete" | "locked" | "unlocked"
) {
  const setupPhase =
    clientStatus === "not_configured"
      ? ("not_configured" as const)
      : clientStatus === "setup_incomplete"
        ? ("setup_incomplete" as const)
        : ("complete" as const);

  return {
    status: "ready" as const,
    clientStatus,
    setupPhase,
    serverStatus: {
      initialized: clientStatus !== "not_configured",
      setupPhase,
    },
    recheck: vi.fn(),
  };
}

describe("notes UX", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { useRequireVault } = await import("@/features/vault/use-require-vault");
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    const { useVaultIndex } = await import("@/features/notes/use-vault-index");
    const { useNotes } = await import("@/features/notes/use-notes");
    const { useCategoriesTags } = await import("@/features/notes/use-categories-tags");

    vi.mocked(useRequireVault).mockReturnValue(mockVaultReady(true));
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("unlocked"));
    vi.mocked(useVaultIndex).mockReturnValue({
      index: sampleIndex,
      loading: false,
      error: null,
      mutateIndex: vi.fn(),
    });
    vi.mocked(useNotes).mockReturnValue({
      createNote: vi.fn(),
      updateNote: vi.fn(),
      deleteNote: vi.fn(),
      busy: false,
      error: null,
    });
    vi.mocked(useCategoriesTags).mockReturnValue({
      categories: sampleIndex.categories,
      tags: sampleIndex.tags,
      loading: false,
      error: null,
      createCategory: vi.fn(),
      renameCategory: vi.fn(),
      removeCategory: vi.fn(),
      createTag: vi.fn(async (name: string) => ({
        id: `tag-${name}`,
        name,
        createdAt: "",
        updatedAt: "",
      })),
      renameTag: vi.fn(),
      removeTag: vi.fn(),
    });
  });

  describe("/notes search and vault UI", () => {
    it("hides search/filter when there are no categories and no tags", async () => {
      const { useVaultIndex } = await import("@/features/notes/use-vault-index");
      vi.mocked(useVaultIndex).mockReturnValue({
        index: { ...sampleIndex, categories: [], tags: [] },
        loading: false,
        error: null,
        mutateIndex: vi.fn(),
      });

      render(<NotesPage />);
      expect(await screen.findByText("Notes")).toBeTruthy();
      expect(screen.queryByLabelText(/search/i)).toBeNull();
      expect(screen.getByText(/create categories or tags to start filtering/i)).toBeTruthy();
    });

    it("shows search/filter when at least one category exists", async () => {
      const { useVaultIndex } = await import("@/features/notes/use-vault-index");
      vi.mocked(useVaultIndex).mockReturnValue({
        index: { ...sampleIndex, tags: [] },
        loading: false,
        error: null,
        mutateIndex: vi.fn(),
      });

      render(<NotesPage />);
      expect(await screen.findByLabelText(/search/i)).toBeTruthy();
    });

    it("shows search/filter when at least one tag exists", async () => {
      const { useVaultIndex } = await import("@/features/notes/use-vault-index");
      vi.mocked(useVaultIndex).mockReturnValue({
        index: { ...sampleIndex, categories: [] },
        loading: false,
        error: null,
        mutateIndex: vi.fn(),
      });

      render(<NotesPage />);
      expect(await screen.findByLabelText(/search/i)).toBeTruthy();
    });

    it("shows closed vault visual when vault is locked", async () => {
      const { useRequireVault } = await import("@/features/vault/use-require-vault");
      const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
      vi.mocked(useRequireVault).mockReturnValue(mockVaultReady(false));
      vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("locked"));

      render(<NotesPage />);
      const indicator = await screen.findByTestId("notes-vault-indicator");
      expect(indicator.getAttribute("data-vault-state")).toBe("closed");
      expect(screen.getByText("Vault locked")).toBeTruthy();
    });

    it("shows open vault visual when vault is unlocked", async () => {
      render(<NotesPage />);
      const indicator = await screen.findByTestId("notes-vault-indicator");
      expect(indicator.getAttribute("data-vault-state")).toBe("open");
      expect(screen.getByText("Vault open")).toBeTruthy();
    });

    it("routes locked vault CTA to /vault/unlock", async () => {
      const { useRequireVault } = await import("@/features/vault/use-require-vault");
      const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
      vi.mocked(useRequireVault).mockReturnValue(mockVaultReady(false));
      vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("locked"));

      render(<NotesPage />);
      expect(
        screen.getByRole("link", { name: /unlock vault/i }).getAttribute("href")
      ).toBe("/vault/unlock");
    });

    it("routes no-vault state to /vault/setup", async () => {
      const { useRequireVault } = await import("@/features/vault/use-require-vault");
      const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
      vi.mocked(useRequireVault).mockReturnValue(mockVaultReady(false));
      vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("not_configured"));

      render(<NotesPage />);
      expect(screen.getByRole("link", { name: /set up your vault/i }).getAttribute("href")).toBe(
        "/vault/setup"
      );
    });
  });

  describe("/notes/new", () => {
    it("requires a title before saving", async () => {
      render(<NewNotePage />);
      fireEvent.change(screen.getByLabelText("Title"), { target: { value: "" } });
      fireEvent.change(screen.getByPlaceholderText(/write in markdown/i), {
        target: { value: "Body" },
      });
      const saveButton = screen.getByRole("button", { name: /save note/i });
      expect(saveButton).toBeDisabled();
      expect(saveButton.getAttribute("title")).toMatch(/add a title before saving/i);
    });

    it("rejects whitespace-only titles", () => {
      render(<NewNotePage />);
      fireEvent.change(screen.getByLabelText("Title"), { target: { value: "   " } });
      fireEvent.change(screen.getByPlaceholderText(/write in markdown/i), {
        target: { value: "Body" },
      });
      const saveButton = screen.getByRole("button", { name: /save note/i });
      expect(saveButton).toBeDisabled();
    });

    it("allows save with a valid title", async () => {
      const { useNotes } = await import("@/features/notes/use-notes");
      const createNote = vi.fn().mockResolvedValue({ id: NOTE_ID });
      vi.mocked(useNotes).mockReturnValue({
        createNote,
        updateNote: vi.fn(),
        deleteNote: vi.fn(),
        busy: false,
        error: null,
      });

      render(<NewNotePage />);
      fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Morning" } });
      fireEvent.change(screen.getByPlaceholderText(/write in markdown/i), {
        target: { value: "Body" },
      });
      fireEvent.click(screen.getByRole("button", { name: /save note/i }));

      await waitFor(() => {
        expect(createNote).toHaveBeenCalledWith(
          expect.objectContaining({ title: "Morning", answered: false })
        );
      });
    });

    it("hides category dropdown when no categories exist", async () => {
      const { useCategoriesTags } = await import("@/features/notes/use-categories-tags");
      vi.mocked(useCategoriesTags).mockReturnValue({
        categories: [],
        tags: sampleIndex.tags,
        loading: false,
        error: null,
        createCategory: vi.fn(),
        renameCategory: vi.fn(),
        removeCategory: vi.fn(),
        createTag: vi.fn(),
        renameTag: vi.fn(),
        removeTag: vi.fn(),
      });

      render(<NewNotePage />);
      expect(screen.queryByLabelText(/^category$/i)).toBeNull();
      expect(screen.getByText(/you can add categories later/i)).toBeTruthy();
    });

    it("shows category dropdown when categories exist", async () => {
      render(<NewNotePage />);
      expect(screen.getByLabelText(/^category$/i)).toBeTruthy();
    });

    it("does not show resolved toggle on new note page", () => {
      render(<NewNotePage />);
      expect(screen.queryByLabelText(/mark as resolved/i)).toBeNull();
    });

    it("renders markdown preview bold text", () => {
      render(<NewNotePage />);
      fireEvent.change(screen.getByPlaceholderText(/write in markdown/i), {
        target: { value: "**bold**" },
      });
      const preview = screen.getByTestId("markdown-preview");
      expect(preview.querySelector("strong")?.textContent).toBe("bold");
    });

    it("renders markdown preview checklist items", () => {
      render(<NewNotePage />);
      fireEvent.change(screen.getByPlaceholderText(/write in markdown/i), {
        target: { value: "- [ ] item one\n- [x] item two" },
      });
      const preview = screen.getByTestId("markdown-preview");
      expect(preview.querySelectorAll('input[type="checkbox"]').length).toBeGreaterThanOrEqual(2);
    });

    it("shows template picker on new note page", () => {
      render(<NewNotePage />);
      expect(screen.getByLabelText(/template/i)).toBeTruthy();
    });

    it("sanitizes unsafe markdown preview content", () => {
      render(<NewNotePage />);
      fireEvent.change(screen.getByPlaceholderText(/write in markdown/i), {
        target: { value: '<script>alert("xss")</script>\n\n**safe**' },
      });
      const preview = screen.getByTestId("markdown-preview");
      expect(preview.innerHTML).not.toContain("<script");
      expect(preview.querySelector("strong")?.textContent).toBe("safe");
    });

    it("still sends encrypted payload only when saving", async () => {
      const vaultKey = await generateUserVaultKey();
      setSessionVaultKey(vaultKey);
      const encrypted = await encryptNote(USER_ID, NOTE_ID, {
        title: "Encrypted title",
        body: "Encrypted body",
        tagIds: [],
        answered: false,
      });

      expect(encrypted.encryptedMetadata).toBeTruthy();
      expect(encrypted.encryptedBody).toBeTruthy();
      expect(JSON.stringify(encrypted)).not.toContain("Encrypted title");
      expect(JSON.stringify(encrypted)).not.toContain("Encrypted body");
    });
  });

  describe("/notes/[id]", () => {
    beforeEach(async () => {
      const { decryptNote } = await import("@/lib/crypto-client/notes");
      const { notesApi } = await import("@/lib/api-client/notes");

      vi.mocked(notesApi.get).mockResolvedValue({
        id: NOTE_ID,
        encryptedMetadata: {},
        encryptedBody: {},
        encryptedWrappedNoteKey: {},
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      } as never);

      vi.mocked(decryptNote).mockResolvedValue({
        metadata: {
          title: "Prayer note",
          body: "**answered**",
          categoryId: "c1",
          tagIds: ["t1"],
          answered: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        body: "**answered**",
      });
    });

    it("renders resolved markdown on detail view", async () => {
      render(<NoteDetailPage />);
      expect(await screen.findByText("Prayer note")).toBeTruthy();
      const preview = screen.getByTestId("markdown-preview");
      expect(preview.querySelector("strong")?.textContent).toBe("answered");
    });

    it("renders bullet list on detail view", async () => {
      const { decryptNote } = await import("@/lib/crypto-client/notes");
      vi.mocked(decryptNote).mockResolvedValueOnce({
        metadata: {
          title: "List note",
          body: "- item 1\n- item 2",
          categoryId: null,
          tagIds: [],
          answered: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        body: "- item 1\n- item 2",
      });

      render(<NoteDetailPage />);
      expect(await screen.findByText("List note")).toBeTruthy();
      const preview = screen.getByTestId("markdown-preview");
      expect(preview.querySelector("ul")).toBeTruthy();
      expect(preview.querySelectorAll("li")).toHaveLength(2);
    });

    it("edit mode textarea shows raw markdown and preview renders resolved markdown", async () => {
      render(<NoteDetailPage />);
      await screen.findByText("Prayer note");
      fireEvent.click(screen.getByRole("button", { name: /edit/i }));

      const textarea = screen.getByPlaceholderText(/write in markdown/i) as HTMLTextAreaElement;
      expect(textarea.value).toBe("**answered**");

      const preview = screen.getByTestId("markdown-preview");
      expect(preview.querySelector("strong")?.textContent).toBe("answered");
    });

    it("displays category differently from tags", async () => {
      render(<NoteDetailPage />);
      await screen.findByText("Prayer note");
      expect(screen.getByText("Prayer")).toBeTruthy();
      expect(screen.getByText("#faith")).toBeTruthy();
    });

    it("shows resolved toggle only while editing", async () => {
      render(<NoteDetailPage />);
      await screen.findByText("Prayer note");
      expect(screen.queryByLabelText(/mark as resolved/i)).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: /edit/i }));
      expect(screen.getByLabelText(/mark as resolved/i)).toBeTruthy();
    });
  });

  describe("tag chip input", () => {
    it("commits on Space, ArrowRight, Enter, and Tab", async () => {
      const onCreateTag = vi.fn(async (name: string) => ({
        id: `id-${name}`,
        name,
        createdAt: "",
        updatedAt: "",
      }));
      const onTagIdsChange = vi.fn();

      render(
        <TagChipInput
          tags={[]}
          tagIds={[]}
          onTagIdsChange={onTagIdsChange}
          onCreateTag={onCreateTag}
        />
      );

      const input = screen.getByLabelText(/add tags/i);

      fireEvent.change(input, { target: { value: "faith" } });
      fireEvent.keyDown(input, { key: " " });
      await waitFor(() => expect(onCreateTag).toHaveBeenCalledWith("faith"));

      onCreateTag.mockClear();
      fireEvent.change(input, { target: { value: "hope" } });
      fireEvent.keyDown(input, { key: "Enter" });
      await waitFor(() => expect(onCreateTag).toHaveBeenCalledWith("hope"));

      onCreateTag.mockClear();
      fireEvent.change(input, { target: { value: "peace" } });
      fireEvent.keyDown(input, { key: "ArrowRight" });
      await waitFor(() => expect(onCreateTag).toHaveBeenCalledWith("peace"));

      onCreateTag.mockClear();
      fireEvent.change(input, { target: { value: "joy" } });
      fireEvent.keyDown(input, { key: "Tab" });
      await waitFor(() => expect(onCreateTag).toHaveBeenCalledWith("joy"));
    });

    it("keeps focus in input after Space commit", async () => {
      const onCreateTag = vi.fn(async (name: string) => ({
        id: `id-${name}`,
        name,
        createdAt: "",
        updatedAt: "",
      }));

      render(
        <TagChipInput tags={[]} tagIds={[]} onTagIdsChange={vi.fn()} onCreateTag={onCreateTag} />
      );

      const input = screen.getByLabelText(/add tags/i) as HTMLInputElement;
      await act(async () => {
        fireEvent.change(input, { target: { value: "faith" } });
        fireEvent.keyDown(input, { key: " " });
      });
      await waitFor(() => expect(onCreateTag).toHaveBeenCalled());
      expect(input.value).toBe("");
    });
  });

  describe("note labels", () => {
    it("renders category without hash and tags with hash", () => {
      const { container: category } = render(<NoteCategoryLabel name="Prayer" />);
      const { container: tag } = render(<NoteTagChip name="faith" />);
      expect(category.textContent).toBe("📁Prayer");
      expect(tag.textContent).toBe("#faith");
    });
  });

  describe("note filter helper", () => {
    it("reports organizer availability", () => {
      expect(hasNoteOrganizers([], [])).toBe(false);
      expect(hasNoteOrganizers([{ id: "c1", name: "Prayer", createdAt: "", updatedAt: "" }], [])).toBe(
        true
      );
      expect(hasNoteOrganizers([], [{ id: "t1", name: "faith", createdAt: "", updatedAt: "" }])).toBe(
        true
      );
    });

    it("returns null when no organizers exist", () => {
      const { container } = render(
        <NoteFilters
          filters={{ search: "", categoryId: "all", tagId: "all", resolved: "all" }}
          categories={[]}
          tags={[]}
          onChange={vi.fn()}
        />
      );
      expect(container).toBeEmptyDOMElement();
    });
  });
});
