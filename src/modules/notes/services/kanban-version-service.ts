import { kanbanRepository } from "@/server/repositories/kanban-repository";
import { kanbanVersionRepository } from "@/server/repositories/kanban-version-repository";
import { vaultRepository } from "@/server/repositories/vault-repository";
import { runInTransaction } from "@/lib/db/transaction";
import type { CreateKanbanVersionInput } from "@/lib/validation/kanban";
import { ENCRYPTION_VERSION } from "@/lib/validation/encrypted-payload";
import { getKanbanVersionHistoryLimit } from "@/lib/config/kanban-policy";
import {
  assertKanbanVersionAad,
  AadValidationError,
} from "@/modules/security/policies/aad-validation";
import { safeLogger } from "@/lib/logger";
import { NotFoundError } from "@/modules/notes/services/note-service";

const MAX_ENCRYPTED_BOARD_PAYLOAD_SIZE = 512 * 1024;

/** Raised when the `note_kanban_versions` table is not yet migrated. */
export class KanbanVersionsUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KanbanVersionsUnavailableError";
  }
}

function isMissingVersionsTable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; cause?: { code?: string } };
  if (e.code === "42P01" || e.cause?.code === "42P01") return true;
  return typeof e.message === "string" && /note_kanban_versions.*does not exist/i.test(e.message);
}

function warnMissingVersionsTable(endpoint: string): void {
  safeLogger.warn("note_kanban_versions table missing — run migration 0016_note_kanban", { endpoint });
}

function validatePayloadSize(payload: unknown): void {
  const size = JSON.stringify(payload).length;
  if (size > MAX_ENCRYPTED_BOARD_PAYLOAD_SIZE) {
    throw new Error("Encrypted kanban version exceeds size limit");
  }
}

async function requireVaultForUser(userId: string) {
  const vault = await vaultRepository.findVaultByUserId(userId);
  if (!vault) throw new NotFoundError("Vault not initialized");
  return vault;
}

export const kanbanVersionService = {
  async create(boardId: string, userId: string, input: CreateKanbanVersionInput) {
    const vault = await requireVaultForUser(userId);
    const board = await kanbanRepository.findByIdForVault(boardId, vault.id);
    if (!board) throw new NotFoundError("Kanban board not found");

    validatePayloadSize(input.encryptedBoard);
    validatePayloadSize(input.encryptedWrappedKey);

    if (input.boardEncryptionVersion !== ENCRYPTION_VERSION) {
      throw new Error("Unsupported encryption version");
    }

    assertKanbanVersionAad(userId, boardId, input.id, board.noteId, input);

    const limit = getKanbanVersionHistoryLimit();

    try {
      return await runInTransaction(async (tx) => {
        const max = await kanbanVersionRepository.maxVersionNumber(boardId, vault.id, tx);
        const version = await kanbanVersionRepository.create(
          {
            id: input.id,
            boardId,
            noteId: board.noteId,
            vaultId: vault.id,
            versionNumber: max + 1,
            encryptedBoard: input.encryptedBoard,
            encryptedWrappedKey: input.encryptedWrappedKey,
            boardEncryptionVersion: input.boardEncryptionVersion,
          },
          tx
        );
        await kanbanVersionRepository.pruneBeyondLimit(boardId, vault.id, limit, tx);
        return version;
      });
    } catch (error) {
      if (isMissingVersionsTable(error)) {
        warnMissingVersionsTable("POST /api/kanban/:boardId/versions");
        throw new KanbanVersionsUnavailableError("Kanban version history is not available");
      }
      throw error;
    }
  },

  async list(boardId: string, userId: string) {
    const vault = await requireVaultForUser(userId);
    const board = await kanbanRepository.findByIdForVault(boardId, vault.id);
    if (!board) throw new NotFoundError("Kanban board not found");
    try {
      return await kanbanVersionRepository.findByBoardId(boardId, vault.id);
    } catch (error) {
      if (isMissingVersionsTable(error)) {
        warnMissingVersionsTable("GET /api/kanban/:boardId/versions");
        return [];
      }
      throw error;
    }
  },

  async getById(boardId: string, versionId: string, userId: string) {
    const vault = await requireVaultForUser(userId);
    const board = await kanbanRepository.findByIdForVault(boardId, vault.id);
    if (!board) throw new NotFoundError("Kanban board not found");
    let version: Awaited<ReturnType<typeof kanbanVersionRepository.findByIdForBoard>>;
    try {
      version = await kanbanVersionRepository.findByIdForBoard(versionId, boardId, vault.id);
    } catch (error) {
      if (isMissingVersionsTable(error)) throw new NotFoundError("Kanban version not found");
      throw error;
    }
    if (!version) throw new NotFoundError("Kanban version not found");
    return version;
  },
};

export { NotFoundError, AadValidationError };
