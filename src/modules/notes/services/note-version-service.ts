import { noteRepository } from "@/server/repositories/note-repository";
import { noteVersionRepository } from "@/server/repositories/note-version-repository";
import { vaultRepository } from "@/server/repositories/vault-repository";
import { runInTransaction } from "@/lib/db/transaction";
import type { CreateNoteVersionInput } from "@/lib/validation/note-versions";
import { ENCRYPTION_VERSION } from "@/lib/validation/encrypted-payload";
import { getNoteVersionHistoryLimit } from "@/lib/config/note-version-policy";
import { assertNoteVersionAad, AadValidationError } from "@/server/policies/aad-validation";
import { NotFoundError } from "./note-service";

const MAX_ENCRYPTED_PAYLOAD_SIZE = 100_000;

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

    return runInTransaction(async (tx) => {
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
  },

  async list(noteId: string, userId: string) {
    const vault = await requireVaultForUser(userId);
    await requireNoteInVault(noteId, vault.id);
    return noteVersionRepository.findByNoteId(noteId, vault.id);
  },

  async getById(noteId: string, versionId: string, userId: string) {
    const vault = await requireVaultForUser(userId);
    await requireNoteInVault(noteId, vault.id);
    const version = await noteVersionRepository.findByIdForNote(versionId, noteId, vault.id);
    if (!version) throw new NotFoundError("Version not found");
    return version;
  },
};

export { NotFoundError, AadValidationError };
