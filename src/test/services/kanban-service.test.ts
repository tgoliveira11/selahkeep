import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  kanbanService,
  AadValidationError,
  ConflictError,
  KanbanUnavailableError,
  NotFoundError,
} from "@/server/services/kanban-service";
import {
  createKanbanBoardInput,
  updateKanbanBoardInput,
  KANBAN_BOARD_ID,
  NOTE_ID,
  USER_ID,
} from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  findVaultByUserId: vi.fn(),
  findNoteByIdForVault: vi.fn(),
  create: vi.fn(),
  findByVaultId: vi.fn(),
  findStandaloneByVaultId: vi.fn(),
  findByIdForVault: vi.fn(),
  findByNoteId: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/server/repositories/vault-repository", () => ({
  vaultRepository: { findVaultByUserId: mocks.findVaultByUserId },
}));

vi.mock("@/server/repositories/note-repository", () => ({
  noteRepository: { findByIdForVault: mocks.findNoteByIdForVault },
}));

vi.mock("@/server/repositories/kanban-repository", () => ({
  kanbanRepository: {
    create: mocks.create,
    findByVaultId: mocks.findByVaultId,
    findStandaloneByVaultId: mocks.findStandaloneByVaultId,
    findByIdForVault: mocks.findByIdForVault,
    findByNoteId: mocks.findByNoteId,
    update: mocks.update,
    delete: mocks.delete,
  },
}));

describe("kanban service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findVaultByUserId.mockResolvedValue({ id: "vault-1" });
    mocks.findNoteByIdForVault.mockResolvedValue({ id: NOTE_ID });
    mocks.findByNoteId.mockResolvedValue(null);
  });

  it("creates a note-bound encrypted board", async () => {
    const input = createKanbanBoardInput();
    mocks.create.mockResolvedValue({ id: KANBAN_BOARD_ID, noteId: NOTE_ID, versionNumber: 1 });

    const result = await kanbanService.create(USER_ID, input);

    expect(mocks.findNoteByIdForVault).toHaveBeenCalledWith(NOTE_ID, "vault-1");
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: KANBAN_BOARD_ID,
        noteId: NOTE_ID,
        vaultId: "vault-1",
        versionNumber: 1,
      })
    );
    expect(result).toEqual({ id: KANBAN_BOARD_ID, noteId: NOTE_ID, versionNumber: 1 });
  });

  it("creates a standalone encrypted board with a board-key AAD", async () => {
    const input = createKanbanBoardInput(null);
    mocks.create.mockResolvedValue({ id: KANBAN_BOARD_ID, noteId: null });

    await expect(kanbanService.create(USER_ID, input)).resolves.toEqual({
      id: KANBAN_BOARD_ID,
      noteId: null,
    });
    expect(mocks.findNoteByIdForVault).not.toHaveBeenCalled();
  });

  it("rejects creating a second board for the same note", async () => {
    mocks.findByNoteId.mockResolvedValue({ id: KANBAN_BOARD_ID });
    await expect(kanbanService.create(USER_ID, createKanbanBoardInput())).rejects.toBeInstanceOf(
      ConflictError
    );
  });

  it("maps unique note-board races to ConflictError", async () => {
    mocks.create.mockRejectedValue(
      Object.assign(new Error("duplicate key"), {
        code: "23505",
        constraint: "idx_note_kanban_boards_note_id",
      })
    );
    await expect(kanbanService.create(USER_ID, createKanbanBoardInput())).rejects.toBeInstanceOf(
      ConflictError
    );
  });

  it("rejects note-bound wrapped keys not bound to the note id", async () => {
    const input = createKanbanBoardInput();
    input.encryptedWrappedKey.aad.resourceId = KANBAN_BOARD_ID;
    await expect(kanbanService.create(USER_ID, input)).rejects.toBeInstanceOf(AadValidationError);
  });

  it("rejects standalone wrapped keys not bound to the board id", async () => {
    const input = createKanbanBoardInput(null);
    input.encryptedWrappedKey.aad.resourceId = NOTE_ID;
    await expect(kanbanService.create(USER_ID, input)).rejects.toBeInstanceOf(AadValidationError);
  });

  it("lists standalone boards", async () => {
    mocks.findStandaloneByVaultId.mockResolvedValue([{ id: KANBAN_BOARD_ID, noteId: null }]);
    await expect(kanbanService.list(USER_ID, { scope: "standalone" })).resolves.toEqual([
      { id: KANBAN_BOARD_ID, noteId: null },
    ]);
  });

  it("updates an existing board", async () => {
    const input = createKanbanBoardInput();
    mocks.findByIdForVault.mockResolvedValue({ id: KANBAN_BOARD_ID, noteId: NOTE_ID });
    mocks.update.mockResolvedValue({ id: KANBAN_BOARD_ID, versionNumber: 1 });

    await expect(kanbanService.update(KANBAN_BOARD_ID, USER_ID, input)).resolves.toEqual({
      id: KANBAN_BOARD_ID,
      versionNumber: 1,
    });
  });

  it("claims a standalone board for a note", async () => {
    const input = { ...updateKanbanBoardInput(), claimNoteId: NOTE_ID };
    mocks.findByIdForVault.mockResolvedValue({ id: KANBAN_BOARD_ID, noteId: null });
    mocks.update.mockResolvedValue({ id: KANBAN_BOARD_ID, noteId: NOTE_ID, versionNumber: 1 });

    const result = await kanbanService.update(KANBAN_BOARD_ID, USER_ID, input);

    expect(mocks.findNoteByIdForVault).toHaveBeenCalledWith(NOTE_ID, "vault-1");
    expect(mocks.findByNoteId).toHaveBeenCalledWith(NOTE_ID, "vault-1");
    expect(mocks.update).toHaveBeenCalledWith(
      KANBAN_BOARD_ID,
      "vault-1",
      expect.objectContaining({ noteId: NOTE_ID })
    );
    expect(result).toEqual({ id: KANBAN_BOARD_ID, noteId: NOTE_ID, versionNumber: 1 });
  });

  it("rejects claiming a note for a board that is already note-bound", async () => {
    const input = { ...updateKanbanBoardInput(), claimNoteId: NOTE_ID };
    mocks.findByIdForVault.mockResolvedValue({ id: KANBAN_BOARD_ID, noteId: NOTE_ID });

    await expect(kanbanService.update(KANBAN_BOARD_ID, USER_ID, input)).rejects.toBeInstanceOf(
      ConflictError
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects claiming a note that already has a different board", async () => {
    const input = { ...updateKanbanBoardInput(), claimNoteId: NOTE_ID };
    mocks.findByIdForVault.mockResolvedValue({ id: KANBAN_BOARD_ID, noteId: null });
    mocks.findByNoteId.mockResolvedValue({ id: "other-board" });

    await expect(kanbanService.update(KANBAN_BOARD_ID, USER_ID, input)).rejects.toBeInstanceOf(
      ConflictError
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("throws NotFoundError for a missing board", async () => {
    mocks.findByIdForVault.mockResolvedValue(null);
    await expect(kanbanService.getById(KANBAN_BOARD_ID, USER_ID)).rejects.toBeInstanceOf(
      NotFoundError
    );
  });


  it("returns [] for drizzle-wrapped missing-table errors on list", async () => {
    mocks.findByVaultId.mockRejectedValue(
      Object.assign(new Error("Failed query: select from note_kanban_boards"), {
        cause: Object.assign(new Error('relation "note_kanban_boards" does not exist'), {
          code: "42P01",
        }),
      })
    );
    await expect(kanbanService.list(USER_ID)).resolves.toEqual([]);
  });

  it("lists all boards as [] when the board table is missing", async () => {
    mocks.findByVaultId.mockRejectedValue(
      Object.assign(new Error('relation "note_kanban_boards" does not exist'), { code: "42P01" })
    );
    await expect(kanbanService.list(USER_ID)).resolves.toEqual([]);
  });

  it("lists note-bound boards as [] when the board table is missing", async () => {
    mocks.findByNoteId.mockRejectedValue(
      Object.assign(new Error('relation "note_kanban_boards" does not exist'), { code: "42P01" })
    );
    await expect(kanbanService.list(USER_ID, { noteId: NOTE_ID })).resolves.toEqual([]);
  });

  it("does not map missing kanban columns to KanbanUnavailableError", async () => {
    mocks.findByNoteId.mockRejectedValue(
      Object.assign(
        new Error('column "version_number" of relation "note_kanban_boards" does not exist'),
        { code: "42703" }
      )
    );
    await expect(kanbanService.list(USER_ID, { noteId: NOTE_ID })).rejects.toThrow(/version_number/);
  });

  it("does not map unrelated 42P01 errors to KanbanUnavailableError", async () => {
    mocks.findByVaultId.mockRejectedValue(
      Object.assign(new Error('relation "notes" does not exist'), { code: "42P01" })
    );
    await expect(kanbanService.list(USER_ID)).rejects.toThrow(/notes/);
  });
});
