import { noteRepository } from "@/modules/notes/repositories/note-repository";
import { kanbanRepository } from "@/modules/notes/repositories/kanban-repository";
import {
  noteAttachmentRepository,
  sumNoteCiphertextBytesByVaultId,
  type AttachmentOwner,
} from "@/modules/notes/repositories/note-attachment-repository";
import { sumStandaloneBoardCiphertextBytesByVaultId } from "@/modules/notes/repositories/kanban-repository";
import { vaultRepository } from "@/server/repositories/vault-repository";
import type { CreateAttachmentInput } from "@/lib/validation/note-attachments";
import { ENCRYPTION_VERSION } from "@/lib/validation/encrypted-payload";
import {
  getMaxAttachmentsPerNote,
  getMaxAttachmentSizeBytes,
  getMaxTotalStorageBytes,
} from "@/lib/config/attachment-policy";
import { assertAttachmentCreateAad, AadValidationError } from "@/modules/security/policies/aad-validation";
import { sumEncryptedPayloadCiphertextBytes } from "@/modules/security/encrypted-payload-size";
import { NotFoundError } from "@/modules/notes/services/note-service";
import { safeLogger } from "@/lib/logger";

export type { AttachmentOwner };

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

async function requireOwnerInVault(owner: AttachmentOwner, vaultId: string): Promise<void> {
  if (owner.kind === "note") {
    const note = await noteRepository.findByIdForVault(owner.id, vaultId);
    if (!note) throw new NotFoundError("Note not found");
    return;
  }
  const board = await kanbanRepository.findByIdForVault(owner.id, vaultId);
  if (!board) throw new NotFoundError("Kanban board not found");
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
  async list(owner: AttachmentOwner, userId: string) {
    const vault = await requireVaultForUser(userId);
    await requireOwnerInVault(owner, vault.id);
    return withAttachmentsTable(
      "GET /api/notes/:id/attachments",
      () => noteAttachmentRepository.findByOwner(owner, vault.id),
      () => []
    );
  },

  async create(owner: AttachmentOwner, userId: string, input: CreateAttachmentInput) {
    const vault = await requireVaultForUser(userId);
    await requireOwnerInVault(owner, vault.id);

    if (input.blobEncryptionVersion !== ENCRYPTION_VERSION) {
      throw new Error("Unsupported encryption version");
    }

    validateAttachmentPayloadSize(input.encryptedMetadata);
    validateAttachmentPayloadSize(input.encryptedBlob);
    assertAttachmentCreateAad(userId, input.id, input);

    const serverCiphertextBytes = sumEncryptedPayloadCiphertextBytes([
      input.encryptedMetadata,
      input.encryptedBlob,
    ]);

    const maxFileBytes = getMaxAttachmentSizeBytes();
    if (serverCiphertextBytes > maxFileBytes * 1.5) {
      throw new Error("Attachment exceeds size limit");
    }

    try {
      const existingCount = await noteAttachmentRepository.countByOwner(owner, vault.id);
      if (existingCount >= getMaxAttachmentsPerNote()) {
        throw new Error("Maximum attachments reached");
      }

      const noteBytes = await sumNoteCiphertextBytesByVaultId(vault.id);
      const boardBytes = await sumStandaloneBoardCiphertextBytesByVaultId(vault.id);
      const attachmentBytes = await noteAttachmentRepository.sumCiphertextBytesByVaultId(vault.id);
      const maxTotal = getMaxTotalStorageBytes();
      if (noteBytes + boardBytes + attachmentBytes + serverCiphertextBytes > maxTotal) {
        throw new Error("Vault storage limit reached");
      }

      return await noteAttachmentRepository.create({
        id: input.id,
        owner,
        vaultId: vault.id,
        encryptedMetadata: input.encryptedMetadata,
        encryptedBlob: input.encryptedBlob,
        blobEncryptionVersion: input.blobEncryptionVersion,
        ciphertextBytes: serverCiphertextBytes,
      });
    } catch (error) {
      if (isMissingAttachmentsTable(error)) {
        warnMissingAttachmentsTable("POST /api/notes/:id/attachments");
        throw new AttachmentsUnavailableError("Note attachments are not available yet");
      }
      throw error;
    }
  },

  async getById(owner: AttachmentOwner, attachmentId: string, userId: string) {
    const vault = await requireVaultForUser(userId);
    await requireOwnerInVault(owner, vault.id);
    let attachment: Awaited<ReturnType<typeof noteAttachmentRepository.findByIdForOwner>>;
    try {
      attachment = await noteAttachmentRepository.findByIdForOwner(attachmentId, owner, vault.id);
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

  async delete(owner: AttachmentOwner, attachmentId: string, userId: string) {
    const vault = await requireVaultForUser(userId);
    await requireOwnerInVault(owner, vault.id);
    let deleted: Awaited<ReturnType<typeof noteAttachmentRepository.delete>>;
    try {
      deleted = await noteAttachmentRepository.delete(attachmentId, owner, vault.id);
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
    const boardsBytes = await sumStandaloneBoardCiphertextBytesByVaultId(vault.id);
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
      notesCiphertextBytes: notesBytes + boardsBytes,
      attachmentsCiphertextBytes: attachmentsBytes,
      totalCiphertextBytes: notesBytes + boardsBytes + attachmentsBytes,
      maxBytes,
      partial,
    };
  },
};

export { AadValidationError };
