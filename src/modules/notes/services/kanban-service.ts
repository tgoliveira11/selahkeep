import { noteRepository } from "@/server/repositories/note-repository";
import { kanbanRepository } from "@/server/repositories/kanban-repository";
import { vaultRepository } from "@/server/repositories/vault-repository";
import type {
  CreateKanbanBoardInput,
  ListKanbanBoardsQuery,
  UpdateKanbanBoardInput,
} from "@/lib/validation/kanban";
import { ENCRYPTION_VERSION } from "@/lib/validation/encrypted-payload";
import {
  assertKanbanBoardAad,
  AadValidationError,
} from "@/modules/security/policies/aad-validation";
import { isMissingRelationError } from "@/lib/db/missing-relation-error";
import { safeLogger } from "@/lib/logger";
import { NotFoundError } from "@/modules/notes/services/note-service";

const MAX_ENCRYPTED_BOARD_PAYLOAD_SIZE = 512 * 1024;
const KANBAN_BOARDS_RELATION = "note_kanban_boards";

/** Raised when the `note_kanban_boards` table is not yet migrated. */
export class KanbanUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KanbanUnavailableError";
  }
}

/** Raised when creating a second board for the same note. */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

function isMissingKanbanTable(error: unknown): boolean {
  return isMissingRelationError(error, KANBAN_BOARDS_RELATION);
}

function isDuplicateNoteBoard(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; constraint?: string };
  if (e.code !== "23505") return false;
  return /note_kanban_boards_note_id/i.test(`${e.constraint ?? ""} ${e.message ?? ""}`);
}

function warnMissingKanbanTable(endpoint: string): void {
  safeLogger.warn("note_kanban_boards table missing — run migration 0016_note_kanban", { endpoint });
}

function validatePayloadSize(payload: unknown): void {
  const size = JSON.stringify(payload).length;
  if (size > MAX_ENCRYPTED_BOARD_PAYLOAD_SIZE) {
    throw new Error("Encrypted kanban board exceeds size limit");
  }
}

async function requireVaultForUser(userId: string) {
  const vault = await vaultRepository.findVaultByUserId(userId);
  if (!vault) throw new NotFoundError("Vault not initialized");
  return vault;
}

async function requireNoteInVault(noteId: string, vaultId: string) {
  const note = await noteRepository.findByIdForVault(noteId, vaultId);
  if (!note) throw new NotFoundError("Note not found");
  return note;
}

async function withKanbanTable<T>(endpoint: string, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isMissingKanbanTable(error)) {
      warnMissingKanbanTable(endpoint);
      throw new KanbanUnavailableError("Kanban boards are not available yet");
    }
    throw error;
  }
}

export const kanbanService = {
  async create(userId: string, input: CreateKanbanBoardInput) {
    const vault = await requireVaultForUser(userId);
    if (input.noteId) await requireNoteInVault(input.noteId, vault.id);

    validatePayloadSize(input.encryptedBoard);
    validatePayloadSize(input.encryptedWrappedKey);

    if (input.boardEncryptionVersion !== ENCRYPTION_VERSION) {
      throw new Error("Unsupported encryption version");
    }

    assertKanbanBoardAad(userId, input.id, input.noteId, input);

    return withKanbanTable("POST /api/kanban", async () => {
      if (input.noteId) {
        const existing = await kanbanRepository.findByNoteId(input.noteId, vault.id);
        if (existing) throw new ConflictError("Kanban board already exists for note");
      }

      try {
        return await kanbanRepository.create({
          id: input.id,
          noteId: input.noteId,
          vaultId: vault.id,
          encryptedBoard: input.encryptedBoard,
          encryptedWrappedKey: input.encryptedWrappedKey,
          boardEncryptionVersion: input.boardEncryptionVersion,
          versionNumber: 1,
        });
      } catch (error) {
        if (isDuplicateNoteBoard(error)) {
          throw new ConflictError("Kanban board already exists for note");
        }
        throw error;
      }
    });
  },

  async list(userId: string, query: ListKanbanBoardsQuery = {}) {
    const vault = await requireVaultForUser(userId);
    if (query.noteId) {
      await requireNoteInVault(query.noteId, vault.id);
    }

    try {
      if (query.noteId) {
        const board = await kanbanRepository.findByNoteId(query.noteId, vault.id);
        return board ? [board] : [];
      }
      if (query.scope === "standalone") {
        return await kanbanRepository.findStandaloneByVaultId(vault.id);
      }
      return await kanbanRepository.findByVaultId(vault.id);
    } catch (error) {
      if (isMissingKanbanTable(error)) {
        warnMissingKanbanTable("GET /api/kanban");
        return [];
      }
      throw error;
    }
  },

  async getById(boardId: string, userId: string) {
    const vault = await requireVaultForUser(userId);
    const board = await withKanbanTable("GET /api/kanban/:boardId", () =>
      kanbanRepository.findByIdForVault(boardId, vault.id)
    );
    if (!board) throw new NotFoundError("Kanban board not found");
    return board;
  },

  async update(boardId: string, userId: string, input: UpdateKanbanBoardInput) {
    if (input.id !== boardId) throw new AadValidationError("Kanban board id does not match route");

    const vault = await requireVaultForUser(userId);
    const existing = await withKanbanTable("PUT /api/kanban/:boardId", () =>
      kanbanRepository.findByIdForVault(boardId, vault.id)
    );
    if (!existing) throw new NotFoundError("Kanban board not found");

    validatePayloadSize(input.encryptedBoard);
    validatePayloadSize(input.encryptedWrappedKey);

    if (input.boardEncryptionVersion !== ENCRYPTION_VERSION) {
      throw new Error("Unsupported encryption version");
    }

    assertKanbanBoardAad(userId, boardId, existing.noteId, input);

    const updated = await withKanbanTable("PUT /api/kanban/:boardId", () =>
      kanbanRepository.update(boardId, vault.id, {
        encryptedBoard: input.encryptedBoard,
        encryptedWrappedKey: input.encryptedWrappedKey,
        boardEncryptionVersion: input.boardEncryptionVersion,
      })
    );
    if (!updated) throw new NotFoundError("Kanban board not found");
    return updated;
  },

  async delete(boardId: string, userId: string) {
    const vault = await requireVaultForUser(userId);
    const deleted = await withKanbanTable("DELETE /api/kanban/:boardId", () =>
      kanbanRepository.delete(boardId, vault.id)
    );
    if (!deleted) throw new NotFoundError("Kanban board not found");
    return { success: true };
  },
};

export { NotFoundError, AadValidationError };
