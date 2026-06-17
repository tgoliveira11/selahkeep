import { noteRepository } from "@/server/repositories/note-repository";
import { vaultRepository } from "@/server/repositories/vault-repository";
import { auditRepository } from "@/server/repositories/audit-repository";
import type { CreateNoteInput, UpdateNoteInput } from "@/lib/validation/notes";
import { ENCRYPTION_VERSION } from "@/lib/validation/encrypted-payload";
import {
  assertNoteCreateAad,
  assertNoteUpdateAad,
  AadValidationError,
} from "@/server/policies/aad-validation";

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

export const noteService = {
  async create(userId: string, input: CreateNoteInput) {
    const vault = await requireVaultForUser(userId);

    validatePayloadSize(input.encryptedMetadata);
    validatePayloadSize(input.encryptedBody);
    validatePayloadSize(input.encryptedWrappedNoteKey);

    if (input.bodyEncryptionVersion !== ENCRYPTION_VERSION) {
      throw new Error("Unsupported encryption version");
    }

    assertNoteCreateAad(userId, input.id, input);

    const note = await noteRepository.create({
      id: input.id,
      vaultId: vault.id,
      encryptedMetadata: input.encryptedMetadata,
      encryptedBody: input.encryptedBody,
      encryptedWrappedNoteKey: input.encryptedWrappedNoteKey,
      bodyEncryptionVersion: input.bodyEncryptionVersion,
    });

    return note;
  },

  async list(userId: string) {
    const vault = await requireVaultForUser(userId);
    return noteRepository.findByVaultId(vault.id);
  },

  async getById(id: string, userId: string) {
    const vault = await requireVaultForUser(userId);
    const note = await noteRepository.findByIdForVault(id, vault.id);
    if (!note) throw new NotFoundError("Note not found");
    return note;
  },

  async update(id: string, userId: string, input: UpdateNoteInput) {
    const vault = await requireVaultForUser(userId);
    const existing = await noteRepository.findByIdForVault(id, vault.id);
    if (!existing) throw new NotFoundError("Note not found");

    if (input.encryptedMetadata) validatePayloadSize(input.encryptedMetadata);
    if (input.encryptedBody) validatePayloadSize(input.encryptedBody);
    if (input.encryptedWrappedNoteKey) validatePayloadSize(input.encryptedWrappedNoteKey);

    assertNoteUpdateAad(userId, id, input);

    const updateData: Parameters<typeof noteRepository.update>[2] = {};
    if (input.encryptedMetadata) updateData.encryptedMetadata = input.encryptedMetadata;
    if (input.encryptedBody) updateData.encryptedBody = input.encryptedBody;
    if (input.encryptedWrappedNoteKey) {
      updateData.encryptedWrappedNoteKey = input.encryptedWrappedNoteKey;
    }
    if (input.bodyEncryptionVersion) updateData.bodyEncryptionVersion = input.bodyEncryptionVersion;

    const note = await noteRepository.update(id, vault.id, updateData);
    if (!note) throw new NotFoundError("Note not found");
    return note;
  },

  async delete(id: string, userId: string) {
    const vault = await requireVaultForUser(userId);
    const deleted = await noteRepository.softDelete(id, vault.id);
    if (!deleted) throw new NotFoundError("Note not found");
    await auditRepository.record("note_deleted", userId, { endpoint: `/api/notes/${id}` });
    return { success: true };
  },
};

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export { AadValidationError };
