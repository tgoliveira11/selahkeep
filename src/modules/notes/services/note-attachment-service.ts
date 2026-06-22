import { noteRepository } from "@/modules/notes/repositories/note-repository";
import {
  noteAttachmentRepository,
  sumNoteCiphertextBytesByVaultId,
} from "@/modules/notes/repositories/note-attachment-repository";
import { vaultRepository } from "@/server/repositories/vault-repository";
import type { CreateAttachmentInput } from "@/lib/validation/note-attachments";
import { ENCRYPTION_VERSION } from "@/lib/validation/encrypted-payload";
import {
  getMaxAttachmentsPerNote,
  getMaxAttachmentSizeBytes,
  getMaxTotalStorageBytes,
} from "@/lib/config/attachment-policy";
import { assertAttachmentCreateAad, AadValidationError } from "@/modules/security/policies/aad-validation";
import { NotFoundError } from "@/modules/notes/services/note-service";
import { safeLogger } from "@/lib/logger";

const MAX_ATTACHMENT_PAYLOAD_JSON = 15 * 1024 * 1024;

/** Raised when the `note_attachments` table is not yet migrated (mapped to 503). */
export class AttachmentsUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttachmentsUnavailableError";
  }
}

/** Detects missing `note_attachments` (PostgreSQL `42P01`) before migration `0013`. */
function isMissingAttachmentsTable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; cause?: { code?: string } };
  if (e.code === "42P01" || e.cause?.code === "42P01") return true;
  return typeof e.message === "string" && /note_attachments.*does not exist/i.test(e.message);
}

function warnMissingAttachmentsTable(endpoint: string): void {
  safeLogger.warn("note_attachments table missing — run migration 0013", { endpoint });
}

function validateAttachmentPayloadSize(payload: unknown): void {
  const size = JSON.stringify(payload).length;
  if (size > MAX_ATTACHMENT_PAYLOAD_JSON) {
    throw new Error("Encrypted attachment payload exceeds size limit");
  }
}

async function requireVaultForUser(userId: string) {
  const vault = await vaultRepository.findVaultByUserId(userId);
  if (!vault) throw new NotFoundError("Vault not initialized");
  return vault;
}

async function withAttachmentsTable<T>(
  endpoint: string,
  operation: () => Promise<T>,
  onMissing: () => T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isMissingAttachmentsTable(error)) {
      warnMissingAttachmentsTable(endpoint);
      return onMissing();
    }
    throw error;
  }
}

export const noteAttachmentService = {
  async list(noteId: string, userId: string) {
    const vault = await requireVaultForUser(userId);
    const note = await noteRepository.findByIdForVault(noteId, vault.id);
    if (!note) throw new NotFoundError("Note not found");
    return withAttachmentsTable(
      "GET /api/notes/:id/attachments",
      () => noteAttachmentRepository.findByNoteId(noteId, vault.id),
      () => []
    );
  },

  async create(noteId: string, userId: string, input: CreateAttachmentInput) {
    const vault = await requireVaultForUser(userId);
    const note = await noteRepository.findByIdForVault(noteId, vault.id);
    if (!note) throw new NotFoundError("Note not found");

    if (input.blobEncryptionVersion !== ENCRYPTION_VERSION) {
      throw new Error("Unsupported encryption version");
    }

    validateAttachmentPayloadSize(input.encryptedMetadata);
    validateAttachmentPayloadSize(input.encryptedBlob);
    assertAttachmentCreateAad(userId, input.id, input);

    const maxFileBytes = getMaxAttachmentSizeBytes();
    if (input.ciphertextBytes > maxFileBytes * 1.5) {
      throw new Error("Attachment exceeds size limit");
    }

    try {
      const existingCount = await noteAttachmentRepository.countByNoteId(noteId, vault.id);
      if (existingCount >= getMaxAttachmentsPerNote()) {
        throw new Error("Maximum attachments per note reached");
      }

      const noteBytes = await sumNoteCiphertextBytesByVaultId(vault.id);
      const attachmentBytes = await noteAttachmentRepository.sumCiphertextBytesByVaultId(vault.id);
      const maxTotal = getMaxTotalStorageBytes();
      if (noteBytes + attachmentBytes + input.ciphertextBytes > maxTotal) {
        throw new Error("Vault storage limit reached");
      }

      return await noteAttachmentRepository.create({
        id: input.id,
        noteId,
        vaultId: vault.id,
        encryptedMetadata: input.encryptedMetadata,
        encryptedBlob: input.encryptedBlob,
        blobEncryptionVersion: input.blobEncryptionVersion,
        ciphertextBytes: input.ciphertextBytes,
      });
    } catch (error) {
      if (isMissingAttachmentsTable(error)) {
        warnMissingAttachmentsTable("POST /api/notes/:id/attachments");
        throw new AttachmentsUnavailableError("Note attachments are not available yet");
      }
      throw error;
    }
  },

  async getById(noteId: string, attachmentId: string, userId: string) {
    const vault = await requireVaultForUser(userId);
    const note = await noteRepository.findByIdForVault(noteId, vault.id);
    if (!note) throw new NotFoundError("Note not found");
    let attachment: Awaited<ReturnType<typeof noteAttachmentRepository.findByIdForNote>>;
    try {
      attachment = await noteAttachmentRepository.findByIdForNote(
        attachmentId,
        noteId,
        vault.id
      );
    } catch (error) {
      if (isMissingAttachmentsTable(error)) {
        warnMissingAttachmentsTable("GET /api/notes/:id/attachments/:attachmentId");
        throw new NotFoundError("Attachment not found");
      }
      throw error;
    }
    if (!attachment) throw new NotFoundError("Attachment not found");
    return attachment;
  },

  async delete(noteId: string, attachmentId: string, userId: string) {
    const vault = await requireVaultForUser(userId);
    const note = await noteRepository.findByIdForVault(noteId, vault.id);
    if (!note) throw new NotFoundError("Note not found");
    let deleted: Awaited<ReturnType<typeof noteAttachmentRepository.delete>>;
    try {
      deleted = await noteAttachmentRepository.delete(attachmentId, noteId, vault.id);
    } catch (error) {
      if (isMissingAttachmentsTable(error)) {
        warnMissingAttachmentsTable("DELETE /api/notes/:id/attachments/:attachmentId");
        throw new AttachmentsUnavailableError("Note attachments are not available yet");
      }
      throw error;
    }
    if (!deleted) throw new NotFoundError("Attachment not found");
    return { success: true };
  },

  async getStorageUsage(userId: string) {
    const vault = await requireVaultForUser(userId);
    const notesBytes = await sumNoteCiphertextBytesByVaultId(vault.id);
    const maxBytes = getMaxTotalStorageBytes();
    let attachmentsBytes = 0;
    let partial = false;
    try {
      attachmentsBytes = await noteAttachmentRepository.sumCiphertextBytesByVaultId(vault.id);
    } catch (error) {
      if (isMissingAttachmentsTable(error)) {
        warnMissingAttachmentsTable("GET /api/vault/storage-usage");
        partial = true;
      } else {
        throw error;
      }
    }
    return {
      notesCiphertextBytes: notesBytes,
      attachmentsCiphertextBytes: attachmentsBytes,
      totalCiphertextBytes: notesBytes + attachmentsBytes,
      maxBytes,
      partial,
    };
  },
};

export { AadValidationError };
