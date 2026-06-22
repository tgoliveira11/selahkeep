import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  noteAttachmentService,
  AttachmentsUnavailableError,
} from "@/modules/notes/services/note-attachment-service";
import { NotFoundError } from "@/modules/notes/services/note-service";
import { ENCRYPTION_VERSION } from "@/lib/validation/encrypted-payload";
import { NOTE_ID, USER_ID, encryptedPayload } from "@/test/helpers/fixtures";

const ATTACHMENT_ID = "550e8400-e29b-41d4-a716-446655440005";

const mocks = vi.hoisted(() => ({
  findVaultByUserId: vi.fn(),
  findByIdForVault: vi.fn(),
  findByNoteId: vi.fn(),
  create: vi.fn(),
  countByNoteId: vi.fn(),
  sumCiphertextBytesByVaultId: vi.fn(),
  sumNoteCiphertextBytesByVaultId: vi.fn(),
  findByIdForNote: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/server/repositories/vault-repository", () => ({
  vaultRepository: { findVaultByUserId: mocks.findVaultByUserId },
}));

vi.mock("@/modules/notes/repositories/note-repository", () => ({
  noteRepository: { findByIdForVault: mocks.findByIdForVault },
}));

vi.mock("@/modules/notes/repositories/note-attachment-repository", () => ({
  noteAttachmentRepository: {
    findByNoteId: mocks.findByNoteId,
    create: mocks.create,
    countByNoteId: mocks.countByNoteId,
    sumCiphertextBytesByVaultId: mocks.sumCiphertextBytesByVaultId,
    findByIdForNote: mocks.findByIdForNote,
    delete: mocks.delete,
  },
  sumNoteCiphertextBytesByVaultId: mocks.sumNoteCiphertextBytesByVaultId,
}));

function createAttachmentInput() {
  return {
    id: ATTACHMENT_ID,
    encryptedMetadata: encryptedPayload("note_attachment_metadata", ATTACHMENT_ID),
    encryptedBlob: encryptedPayload("note_attachment_blob", ATTACHMENT_ID),
    blobEncryptionVersion: ENCRYPTION_VERSION,
    ciphertextBytes: 1024,
  };
}

describe("note attachment service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findVaultByUserId.mockResolvedValue({ id: "vault-1" });
    mocks.findByIdForVault.mockResolvedValue({ id: NOTE_ID });
    mocks.sumNoteCiphertextBytesByVaultId.mockResolvedValue(0);
    mocks.sumCiphertextBytesByVaultId.mockResolvedValue(0);
    mocks.countByNoteId.mockResolvedValue(0);
  });

  it("list degrades to [] when note_attachments table is missing", async () => {
    mocks.findByNoteId.mockRejectedValue({ code: "42P01" });
    await expect(noteAttachmentService.list(NOTE_ID, USER_ID)).resolves.toEqual([]);
  });

  it("create maps missing table to AttachmentsUnavailableError", async () => {
    mocks.countByNoteId.mockRejectedValue(
      Object.assign(new Error('relation "note_attachments" does not exist'), { code: "42P01" })
    );
    await expect(
      noteAttachmentService.create(NOTE_ID, USER_ID, createAttachmentInput())
    ).rejects.toBeInstanceOf(AttachmentsUnavailableError);
  });

  it("getStorageUsage marks partial when attachments table is missing", async () => {
    mocks.sumCiphertextBytesByVaultId.mockRejectedValue({ code: "42P01" });
    const usage = await noteAttachmentService.getStorageUsage(USER_ID);
    expect(usage.partial).toBe(true);
    expect(usage.attachmentsCiphertextBytes).toBe(0);
  });

  it("rejects when note is missing", async () => {
    mocks.findByIdForVault.mockResolvedValue(null);
    await expect(noteAttachmentService.list(NOTE_ID, USER_ID)).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});
