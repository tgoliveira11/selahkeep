/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import NoteDetailPage from "@/app/(vault)/notes/[id]/page";
import { NoteReadingView } from "@/components/notes/note-reading-view";
import { NoteCategoryLabel, NoteTagChip } from "@/components/notes/note-labels";
import { USER_ID, NOTE_ID } from "@/test/helpers/fixtures";

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: routerPush, replace: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => `/notes/${NOTE_ID}`),
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

vi.mock("@/features/notes/use-vault-index", () => ({
  useVaultIndex: vi.fn(),
}));

vi.mock("@/features/notes/use-categories-tags", () => ({
  useCategoriesTags: vi.fn(),
}));

vi.mock("@/lib/api-client/notes", () => ({
  notesApi: { get: vi.fn() },
}));

vi.mock("@/lib/crypto-client/notes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/crypto-client/notes")>();
  return { ...actual, decryptNote: vi.fn() };
});

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
  useVaultActivity: vi.fn(),
  touchVaultActivity: vi.fn(),
}));

vi.mock("@/lib/crypto-client/note-drafts", () => ({
  loadEncryptedNoteDraft: vi.fn().mockResolvedValue(null),
  saveEncryptedNoteDraft: vi.fn(),
  deleteEncryptedNoteDraft: vi.fn(),
  listEncryptedNoteDraftKeys: vi.fn().mockResolvedValue([]),
}));

const categories = [{ id: "c1", name: "Pray", createdAt: "", updatedAt: "" }];
const tags = [{ id: "t1", name: "teste", createdAt: "", updatedAt: "" }];

function baseMetadata(overrides: Record<string, unknown> = {}) {
  return {
    title: "Prayed that today",
    categoryId: "c1",
    tagIds: ["t1"],
    answered: false,
    pinned: true,
    favorite: true,
    archived: false,
    trashed: false,
    trashedAt: null,
    createdAt: "2026-06-17T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
    ...overrides,
  };
}

function mockVaultReady(unlocked: boolean) {
  return {
    status: "ready" as const,
    userId: USER_ID,
    vaultUnlocked: unlocked,
    recheckVault: vi.fn(),
  };
}

function mockClientStatus(clientStatus: "locked" | "unlocked") {
  return {
    status: "ready" as const,
    clientStatus,
    setupPhase: "complete" as const,
    serverStatus: { initialized: true, setupPhase: "complete" as const },
    recheck: vi.fn(),
  };
}

async function setupDetailMocks(metadata = baseMetadata(), body = "# Heading\n\n- item\n- [ ] task") {
  const { useRequireVault } = await import("@/features/vault/use-require-vault");
  const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
  const { useNotes } = await import("@/features/notes/use-notes");
  const { useVaultIndex } = await import("@/features/notes/use-vault-index");
  const { useCategoriesTags } = await import("@/features/notes/use-categories-tags");
  const { notesApi } = await import("@/lib/api-client/notes");
  const { decryptNote } = await import("@/lib/crypto-client/notes");

  vi.mocked(useRequireVault).mockReturnValue(mockVaultReady(true));
  vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("unlocked"));
  vi.mocked(useCategoriesTags).mockReturnValue({
    categories,
    tags,
    loading: false,
    error: null,
    createCategory: vi.fn(),
    renameCategory: vi.fn(),
    removeCategory: vi.fn(),
    createTag: vi.fn(),
    renameTag: vi.fn(),
    removeTag: vi.fn(),
  });
  vi.mocked(useNotes).mockReturnValue({
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    moveNoteToTrash: vi.fn(),
    restoreNoteFromTrash: vi.fn(),
    permanentlyDeleteNote: vi.fn(),
    toggleNoteResolved: vi.fn(),
    toggleNotePinned: vi.fn(),
    toggleNoteFavorite: vi.fn(),
    toggleNoteArchived: vi.fn(),
    duplicateNote: vi.fn(),
    busy: false,
    error: null,
  });
  vi.mocked(useVaultIndex).mockReturnValue({
    index: null,
    loading: false,
    error: null,
    mutateIndex: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn(),
    persistIndex: vi.fn(),
  });
  vi.mocked(notesApi.get).mockResolvedValue({
    id: NOTE_ID,
    encryptedMetadata: {},
    encryptedBody: {},
    encryptedWrappedNoteKey: {},
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt,
  } as never);
  vi.mocked(decryptNote).mockResolvedValue({ metadata, body });
}

describe("note detail reading view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerPush.mockClear();
  });

  describe("layout and actions", () => {
    beforeEach(async () => {
      await setupDetailMocks();
    });

    it("renders as a note reading view", async () => {
      render(<NoteDetailPage />);
      expect(await screen.findByTestId("note-reading-view")).toBeTruthy();
    });

    it("shows back to notes link", async () => {
      render(<NoteDetailPage />);
      expect(await screen.findByRole("button", { name: /back to notes/i })).toBeTruthy();
    });

    it("shows note title in header area", async () => {
      render(<NoteDetailPage />);
      expect(await screen.findByRole("heading", { name: /prayed that today/i })).toBeTruthy();
    });

    it("shows Edit as primary visible action", async () => {
      render(<NoteDetailPage />);
      const edit = await screen.findByTestId("note-edit-button");
      expect(edit).toBeTruthy();
      expect(edit.tagName).toBe("BUTTON");
    });

    it("hides move to trash as large always-visible button", async () => {
      render(<NoteDetailPage />);
      await screen.findByText("Prayed that today");
      expect(screen.queryByTestId("move-to-trash")).toBeNull();
    });

    it("enters and exits zen reading mode", async () => {
      render(<NoteDetailPage />);
      fireEvent.click(await screen.findByTestId("note-zen-button"));

      // Zen surface shows the title; chrome (more-actions menu) is gone.
      expect(await screen.findByTestId("note-reading-zen")).toBeInTheDocument();
      expect(screen.queryByTestId("note-more-actions-menu")).toBeNull();

      fireEvent.click(screen.getByTestId("note-zen-exit"));
      expect(await screen.findByTestId("note-reading-view")).toBeInTheDocument();
    });

    it("exposes secondary actions inside More actions menu", async () => {
      render(<NoteDetailPage />);
      await screen.findByText("Prayed that today");
      fireEvent.click(screen.getByTestId("note-more-actions-menu"));
      const panel = await screen.findByTestId("note-more-actions-menu-panel");
      expect(within(panel).getByTestId("toggle-pinned")).toBeTruthy();
      expect(within(panel).getByTestId("toggle-favorite")).toBeTruthy();
      expect(within(panel).getByTestId("toggle-archived")).toBeTruthy();
      expect(within(panel).getByTestId("duplicate-note")).toBeTruthy();
      expect(within(panel).getByTestId("move-to-trash")).toBeTruthy();
    });

    it("closes More actions menu on Escape", async () => {
      render(<NoteDetailPage />);
      await screen.findByText("Prayed that today");
      fireEvent.click(screen.getByTestId("note-more-actions-menu"));
      expect(screen.getByTestId("note-more-actions-menu-panel")).toBeTruthy();
      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(screen.queryByTestId("note-more-actions-menu-panel")).toBeNull());
    });
  });

  describe("state indicators", () => {
    beforeEach(async () => {
      await setupDetailMocks();
    });

    it("uses fixed indicator order pinned favorite resolved", async () => {
      render(<NoteDetailPage />);
      const core = await screen.findByTestId("note-state-indicators-core");
      const slots = core.querySelectorAll(".note-state-indicators__slot, button.note-state-indicators__slot--interactive");
      expect(slots).toHaveLength(3);
      expect(screen.getByTestId("note-pinned-badge")).toBeTruthy();
      expect(screen.getByTestId("note-favorite-badge")).toBeTruthy();
      expect(screen.getByTestId("note-unresolved-indicator")).toBeTruthy();
    });

    it("keeps resolved control inside indicator row not detached", async () => {
      render(<NoteDetailPage />);
      await screen.findByTestId("note-state-indicators");
      expect(screen.getByTestId("note-unresolved-indicator").closest("[data-testid='note-state-indicators-core']")).toBeTruthy();
    });

    it("provides accessible labels for pin favorite and resolved", async () => {
      render(<NoteDetailPage />);
      await screen.findByText("Prayed that today");
      expect(screen.getByLabelText(/pinned note/i)).toBeTruthy();
      expect(screen.getByLabelText(/favorite note/i)).toBeTruthy();
      expect(screen.getByLabelText(/mark as resolved/i)).toBeTruthy();
    });

    it("does not navigate when clicking indicators", async () => {
      render(<NoteDetailPage />);
      fireEvent.click(await screen.findByLabelText(/mark as resolved/i));
      expect(routerPush).not.toHaveBeenCalled();
    });
  });

  describe("metadata", () => {
    beforeEach(async () => {
      await setupDetailMocks();
    });

    it("shows category badge tags dates", async () => {
      render(<NoteDetailPage />);
      await screen.findByTestId("note-detail-metadata");
      expect(screen.getByText("Pray")).toBeTruthy();
      expect(screen.getByText("#teste")).toBeTruthy();
      const dates = screen.getByTestId("note-detail-dates");
      expect(dates.textContent).toMatch(/Created/);
      expect(dates.textContent).toMatch(/Updated/);
    });

    it("keeps category visually distinct from tags", () => {
      const { container: category } = render(<NoteCategoryLabel name="Pray" />);
      const { container: tag } = render(<NoteTagChip name="teste" />);
      expect(category.firstChild).not.toEqual(tag.firstChild);
      expect(tag.textContent).toMatch(/^#/);
      expect(category.textContent).not.toMatch(/^#/);
    });
  });

  describe("reading surface", () => {
    beforeEach(async () => {
      await setupDetailMocks(
        baseMetadata(),
        "# Heading\n\n- one\n- two\n\n- [ ] task\n\n<script>alert(1)</script>"
      );
    });

    it("renders markdown headings lists checklists", async () => {
      render(<NoteDetailPage />);
      const surface = await screen.findByTestId("note-reading-surface");
      expect(surface.querySelector("h1")?.textContent).toBe("Heading");
      expect(surface.querySelector("ul")).toBeTruthy();
      expect(surface.querySelectorAll("li").length).toBeGreaterThanOrEqual(2);
      expect(surface.querySelector('input[type="checkbox"]')).toBeTruthy();
    });

    it("sanitizes unsafe html", async () => {
      render(<NoteDetailPage />);
      const preview = await screen.findByTestId("markdown-preview");
      expect(preview.innerHTML).not.toContain("<script");
    });

    it("does not render textarea in view mode", async () => {
      render(<NoteDetailPage />);
      await screen.findByTestId("note-reading-view");
      expect(screen.queryByTestId("markdown-expert-textarea")).toBeNull();
      expect(screen.queryByRole("textbox")).toBeNull();
    });
  });

  describe("archived and trash states", () => {
    it("shows archived banner and restore in menu", async () => {
      await setupDetailMocks(baseMetadata({ archived: true, pinned: false, favorite: false }));
      render(<NoteDetailPage />);
      expect(await screen.findByTestId("note-archived-banner")).toBeTruthy();
      fireEvent.click(screen.getByTestId("note-more-actions-menu"));
      expect(within(screen.getByTestId("note-more-actions-menu-panel")).getByText(/restore to active notes/i)).toBeTruthy();
    });

    it("shows trash banner restore and permanent delete", async () => {
      await setupDetailMocks(baseMetadata({ trashed: true, archived: false }));
      render(<NoteDetailPage />);
      expect(await screen.findByTestId("note-trashed-banner")).toBeTruthy();
      expect(screen.getByTestId("restore-note")).toBeTruthy();
      expect(screen.getByTestId("permanent-delete")).toBeTruthy();
      expect(screen.queryByTestId("note-edit-button")).toBeNull();
    });

    it("active note does not show permanent delete directly", async () => {
      await setupDetailMocks();
      render(<NoteDetailPage />);
      await screen.findByText("Prayed that today");
      expect(screen.queryByTestId("permanent-delete")).toBeNull();
    });
  });

  describe("locked state", () => {
    it("hides decrypted metadata and body when locked", async () => {
      const { useRequireVault } = await import("@/features/vault/use-require-vault");
      const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
      vi.mocked(useRequireVault).mockReturnValue(mockVaultReady(false));
      vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("locked"));
      render(<NoteDetailPage />);
      expect(await screen.findByTestId("vault-locked-state-read-note")).toBeTruthy();
      expect(screen.queryByText("Prayed that today")).toBeNull();
      expect(screen.queryByTestId("note-detail-metadata")).toBeNull();
      expect(screen.queryByTestId("markdown-preview")).toBeNull();
      expect(screen.getByText(/unlock your vault to read or edit/i)).toBeTruthy();
    });
  });

  describe("regression", () => {
    beforeEach(async () => {
      await setupDetailMocks();
    });

    it("edit still works", async () => {
      const { decryptNote } = await import("@/lib/crypto-client/notes");
      vi.mocked(decryptNote).mockResolvedValueOnce({
        metadata: {
          title: "Prayer note",
          categoryId: "c1",
          tagIds: ["t1"],
          answered: false,
          pinned: false,
          favorite: false,
          archived: false,
          trashed: false,
          trashedAt: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
        body: "**answered**",
      });
      render(<NoteDetailPage />);
      fireEvent.click(await screen.findByRole("button", { name: /^edit$/i }));
      fireEvent.click(screen.getByTestId("editor-mode-markdown"));
      await waitFor(() => expect(screen.getByTestId("markdown-expert-textarea")).toBeTruthy());
    });

    it("move to trash opens confirmation from menu", async () => {
      render(<NoteDetailPage />);
      await screen.findByText("Prayed that today");
      fireEvent.click(screen.getByTestId("note-more-actions-menu"));
      fireEvent.click(within(screen.getByTestId("note-more-actions-menu-panel")).getByTestId("move-to-trash"));
      expect(screen.getByText(/move note to trash/i)).toBeTruthy();
      expect(screen.getByText(/you can restore this note from trash later/i)).toBeTruthy();
    });
  });
});

describe("UI/UX documentation guards", () => {
  const docsRoot = path.resolve(__dirname, "../../../docs");

  it("UI_UX_DIRECTION contains required patterns", () => {
    const content = readFileSync(path.join(docsRoot, "UI_UX_DIRECTION.md"), "utf8");
    const sections = [
      "Note Reading View Pattern",
      "Destructive Action Pattern",
      "State Indicator Pattern",
      "Locked State Pattern",
      "Metadata Badge Pattern",
    ];
    for (const section of sections) {
      expect(content).toContain(section);
    }
  });

  it("UI_UX_DIRECTION exists", () => {
    expect(existsSync(path.join(docsRoot, "UI_UX_DIRECTION.md"))).toBe(true);
  });
});

describe("NoteReadingView unit", () => {
  it("renders trash actions without more menu", () => {
    render(
      <NoteReadingView
        metadata={baseMetadata({ trashed: true }) as never}
        body="body"
        categories={categories}
        tags={tags}
        checklistSaveState="idle"
        onEdit={vi.fn()}
        onToggleResolved={vi.fn()}
        onTogglePinned={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleArchived={vi.fn()}
        onDuplicate={vi.fn()}
        onMoveToTrash={vi.fn()}
        onRestoreFromTrash={vi.fn()}
        onPermanentDelete={vi.fn()}
        onChecklistChange={vi.fn()}
      />
    );
    expect(screen.getByTestId("restore-note")).toBeTruthy();
    expect(screen.queryByTestId("note-more-actions-menu")).toBeNull();
  });
});
