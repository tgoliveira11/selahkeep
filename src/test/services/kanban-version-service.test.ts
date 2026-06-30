import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  kanbanVersionService,
  AadValidationError,
  KanbanVersionsUnavailableError,
  NotFoundError,
} from "@/server/services/kanban-version-service";
import {
  createKanbanVersionInput,
  KANBAN_BOARD_ID,
  KANBAN_VERSION_ID,
  NOTE_ID,
  USER_ID,
} from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  findVaultByUserId: vi.fn(),
  findBoardByIdForVault: vi.fn(),
  create: vi.fn(),
  maxVersionNumber: vi.fn(),
  pruneBeyondLimit: vi.fn(),
  findByBoardId: vi.fn(),
  findByIdForBoard: vi.fn(),
}));

vi.mock("@/server/repositories/vault-repository", () => ({
  vaultRepository: { findVaultByUserId: mocks.findVaultByUserId },
}));

vi.mock("@/server/repositories/kanban-repository", () => ({
  kanbanRepository: { findByIdForVault: mocks.findBoardByIdForVault },
}));

vi.mock("@/server/repositories/kanban-version-repository", () => ({
  kanbanVersionRepository: {
    create: mocks.create,
    maxVersionNumber: mocks.maxVersionNumber,
    pruneBeyondLimit: mocks.pruneBeyondLimit,
    findByBoardId: mocks.findByBoardId,
    findByIdForBoard: mocks.findByIdForBoard,
  },
}));

vi.mock("@/lib/db/transaction", () => ({
  runInTransaction: (fn: (tx: unknown) => unknown) => fn({}),
}));

describe("kanban version service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findVaultByUserId.mockResolvedValue({ id: "vault-1" });
    mocks.findBoardByIdForVault.mockResolvedValue({ id: KANBAN_BOARD_ID, noteId: NOTE_ID });
  });

  it("assigns the next version number and prunes beyond the limit", async () => {
    mocks.maxVersionNumber.mockResolvedValue(2);
    mocks.create.mockResolvedValue({ id: KANBAN_VERSION_ID, versionNumber: 3 });

    const result = await kanbanVersionService.create(
      KANBAN_BOARD_ID,
      USER_ID,
      createKanbanVersionInput()
    );

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        boardId: KANBAN_BOARD_ID,
        noteId: NOTE_ID,
        vaultId: "vault-1",
        versionNumber: 3,
      }),
      expect.anything()
    );
    expect(mocks.pruneBeyondLimit).toHaveBeenCalledWith(
      KANBAN_BOARD_ID,
      "vault-1",
      50,
      expect.anything()
    );
    expect(result).toEqual({ id: KANBAN_VERSION_ID, versionNumber: 3 });
  });

  it("starts at version 1 for the first snapshot", async () => {
    mocks.maxVersionNumber.mockResolvedValue(0);
    mocks.create.mockResolvedValue({ id: KANBAN_VERSION_ID, versionNumber: 1 });
    await kanbanVersionService.create(KANBAN_BOARD_ID, USER_ID, createKanbanVersionInput());
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ versionNumber: 1 }),
      expect.anything()
    );
  });

  it("validates standalone board-key AAD against the board id", async () => {
    mocks.findBoardByIdForVault.mockResolvedValue({ id: KANBAN_BOARD_ID, noteId: null });
    mocks.maxVersionNumber.mockResolvedValue(0);
    mocks.create.mockResolvedValue({ id: KANBAN_VERSION_ID, versionNumber: 1 });

    await expect(
      kanbanVersionService.create(KANBAN_BOARD_ID, USER_ID, createKanbanVersionInput(null))
    ).resolves.toEqual({ id: KANBAN_VERSION_ID, versionNumber: 1 });
  });

  it("rejects version content not bound to the version id", async () => {
    const input = createKanbanVersionInput();
    input.encryptedBoard.aad.resourceId = KANBAN_BOARD_ID;
    await expect(kanbanVersionService.create(KANBAN_BOARD_ID, USER_ID, input)).rejects.toBeInstanceOf(
      AadValidationError
    );
  });

  it("rejects note-bound wrapped keys not bound to the note id", async () => {
    const input = createKanbanVersionInput();
    input.encryptedWrappedKey.aad.resourceId = KANBAN_BOARD_ID;
    await expect(kanbanVersionService.create(KANBAN_BOARD_ID, USER_ID, input)).rejects.toBeInstanceOf(
      AadValidationError
    );
  });

  it("lists versions for a board", async () => {
    mocks.findByBoardId.mockResolvedValue([{ id: KANBAN_VERSION_ID, versionNumber: 1 }]);
    await expect(kanbanVersionService.list(KANBAN_BOARD_ID, USER_ID)).resolves.toEqual([
      { id: KANBAN_VERSION_ID, versionNumber: 1 },
    ]);
  });

  it("getById returns a version", async () => {
    mocks.findByIdForBoard.mockResolvedValue({ id: KANBAN_VERSION_ID });
    await expect(
      kanbanVersionService.getById(KANBAN_BOARD_ID, KANBAN_VERSION_ID, USER_ID)
    ).resolves.toEqual({ id: KANBAN_VERSION_ID });
  });

  it("throws NotFoundError for a missing board", async () => {
    mocks.findBoardByIdForVault.mockResolvedValue(null);
    await expect(
      kanbanVersionService.create(KANBAN_BOARD_ID, USER_ID, createKanbanVersionInput())
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("list degrades to [] when the versions table is missing", async () => {
    mocks.findByBoardId.mockRejectedValue({ code: "42P01" });
    await expect(kanbanVersionService.list(KANBAN_BOARD_ID, USER_ID)).resolves.toEqual([]);
  });

  it("create throws KanbanVersionsUnavailableError when the table is missing", async () => {
    mocks.maxVersionNumber.mockRejectedValue(
      Object.assign(new Error('relation "note_kanban_versions" does not exist'), { code: "42P01" })
    );
    await expect(
      kanbanVersionService.create(KANBAN_BOARD_ID, USER_ID, createKanbanVersionInput())
    ).rejects.toBeInstanceOf(KanbanVersionsUnavailableError);
  });
});
