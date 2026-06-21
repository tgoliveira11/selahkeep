import { noteRepository } from "@/server/repositories/note-repository";
import { noteVersionRepository } from "@/server/repositories/note-version-repository";
import { vaultRepository } from "@/server/repositories/vault-repository";
import { runInTransaction } from "@/lib/db/transaction";
import type { CreateNoteVersionInput } from "@/lib/validation/note-versions";
import { ENCRYPTION_VERSION } from "@/lib/validation/encrypted-payload";
import { getNoteVersionHistoryLimit } from "@/lib/config/note-version-policy";
import { assertNoteVersionAad, AadValidationError } from "@/server/policies/aad-validation";
import { safeLogger } from "@/lib/logger";
import { NotFoundError } from "./note-service";

const MAX_ENCRYPTED_PAYLOAD_SIZE = 100_000;

/** Raised when the `note_versions` table is not yet migrated (mapped to 503). */
export class VersionsUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VersionsUnavailableError";
  }
}

/**
 * Detects a missing `note_versions` table (PostgreSQL `42P01`). This happens
 * when migration `0012_note_versions.sql` has not been applied to the database,
 * so we degrade gracefully instead of returning a hard 500.
 */
function isMissingVersionsTable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; cause?: { code?: string } };
  if (e.code === "42P01" || e.cause?.code === "42P01") return true;
  return typeof e.message === "string" && /note_versions.*does not exist/i.test(e.message);
}

function validatePayloadSize(payload: unknown): void {
  const size = JSON.stringify(payload).length;
  if (size > MAX_ENCRYPTED_PAYLOAD_SIZE) {
    throw new Error("Encrypted payload exceeds size limit");
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

export const noteVersionService = {
  async create(noteId: string, userId: string, input: CreateNoteVersionInput) {
    const vault = await requireVaultForUser(userId);
    await requireNoteInVault(noteId, vault.id);

    validatePayloadSize(input.encryptedMetadata);
    validatePayloadSize(input.encryptedBody);
    validatePayloadSize(input.encryptedWrappedNoteKey);

    if (input.bodyEncryptionVersion !== ENCRYPTION_VERSION) {
      throw new Error("Unsupported encryption version");
    }

    assertNoteVersionAad(userId, noteId, input.id, input);

    const limit = getNoteVersionHistoryLimit();

    try {
      return await runInTransaction(async (tx) => {
        const max = await noteVersionRepository.maxVersionNumber(noteId, vault.id, tx);
        const version = await noteVersionRepository.create(
          {
            id: input.id,
            noteId,
            vaultId: vault.id,
            versionNumber: max + 1,
            encryptedMetadata: input.encryptedMetadata,
            encryptedBody: input.encryptedBody,
            encryptedWrappedNoteKey: input.encryptedWrappedNoteKey,
            bodyEncryptionVersion: input.bodyEncryptionVersion,
          },
          tx
        );
        await noteVersionRepository.pruneBeyondLimit(noteId, vault.id, limit, tx);
        return version;
      });
    } catch (error) {
      if (isMissingVersionsTable(error)) {
        safeLogger.warn("note_versions table missing — run migration 0012", {
          endpoint: "/api/notes/:id/versions",
        });
        throw new VersionsUnavailableError("Note version history is not available");
      }
      throw error;
    }
  },

  async list(noteId: string, userId: string) {
    const vault = await requireVaultForUser(userId);
    await requireNoteInVault(noteId, vault.id);
    try {
      return await noteVersionRepository.findByNoteId(noteId, vault.id);
    } catch (error) {
      if (isMissingVersionsTable(error)) {
        safeLogger.warn("note_versions table missing — run migration 0012", {
          endpoint: "/api/notes/:id/versions",
        });
        return [];
      }
      throw error;
    }
  },

  async getById(noteId: string, versionId: string, userId: string) {
    const vault = await requireVaultForUser(userId);
    await requireNoteInVault(noteId, vault.id);
    let version: Awaited<ReturnType<typeof noteVersionRepository.findByIdForNote>>;
    try {
      version = await noteVersionRepository.findByIdForNote(versionId, noteId, vault.id);
    } catch (error) {
      if (isMissingVersionsTable(error)) throw new NotFoundError("Version not found");
      throw error;
    }
    if (!version) throw new NotFoundError("Version not found");
    return version;
  },
};

export { NotFoundError, AadValidationError };
