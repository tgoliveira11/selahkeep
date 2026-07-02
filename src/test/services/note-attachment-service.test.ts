import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  noteAttachmentService,
  AttachmentsUnavailableError,
} from "@/modules/notes/services/note-attachment-service";
import { NotFoundError } from "@/modules/notes/services/note-service";
import { ENCRYPTION_VERSION } from "@/lib/validation/encrypted-payload";
import { NOTE_ID, USER_ID, encryptedPayload } from "@/test/helpers/fixtures";

const ATTACHMENT_ID = "550e8400-e29b-41d4-a716-446655440005";
const NOTE_OWNER = { kind: "note" as const, id: NOTE_ID };

const mocks = vi.hoisted(() => ({
  findVaultByUserId: vi.fn(),
  findByIdForVault: vi.fn(),
  findKanbanBoardByIdForVault: vi.fn(),
  findByOwner: vi.fn(),
  create: vi.fn(),
  countByOwner: vi.fn(),
  sumCiphertextBytesByVaultId: vi.fn(),
  sumNoteCiphertextBytesByVaultId: vi.fn(),
  sumStandaloneBoardCiphertextBytesByVaultId: vi.fn(),
  findByIdForOwner: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/server/repositories/vault-repository", () => ({
  vaultRepository: { findVaultByUserId: mocks.findVaultByUserId },
}));

vi.mock("@/modules/notes/repositories/note-repository", () => ({
  noteRepository: { findByIdForVault: mocks.findByIdForVault },
}));

vi.mock("@/modules/notes/repositories/kanban-repository", () => ({
  kanbanRepository: { findByIdForVault: mocks.findKanbanBoardByIdForVault },
  sumStandaloneBoardCiphertextBytesByVaultId: mocks.sumStandaloneBoardCiphertextBytesByVaultId,
}));

vi.mock("@/modules/notes/repositories/note-attachment-repository", () => ({
  noteAttachmentRepository: {
    findByOwner: mocks.findByOwner,
    create: mocks.create,
    countByOwner: mocks.countByOwner,
    sumCiphertextBytesByVaultId: mocks.sumCiphertextBytesByVaultId,
    findByIdForOwner: mocks.findByIdForOwner,
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
    mocks.sumStandaloneBoardCiphertextBytesByVaultId.mockResolvedValue(0);
    mocks.sumCiphertextBytesByVaultId.mockResolvedValue(0);
    mocks.countByOwner.mockResolvedValue(0);
  });

  it("list degrades to [] when note_attachments table is missing", async () => {
    mocks.findByOwner.mockRejectedValue({ code: "42P01" });
    await expect(noteAttachmentService.list(NOTE_OWNER, USER_ID)).resolves.toEqual([]);
  });

  it("create maps missing table to AttachmentsUnavailableError", async () => {
    mocks.countByOwner.mockRejectedValue(
      Object.assign(new Error('relation "note_attachments" does not exist'), { code: "42P01" })
    );
    await expect(
      noteAttachmentService.create(NOTE_OWNER, USER_ID, createAttachmentInput())
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
    await expect(noteAttachmentService.list(NOTE_OWNER, USER_ID)).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("rejects when board is missing", async () => {
    mocks.findKanbanBoardByIdForVault.mockResolvedValue(null);
    await expect(
      noteAttachmentService.list({ kind: "board", id: "board-1" }, USER_ID)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("creates an attachment when within limits", async () => {
    const input = createAttachmentInput();
    const created = { id: input.id, noteId: NOTE_ID };
    mocks.create.mockResolvedValue(created);
    await expect(noteAttachmentService.create(NOTE_OWNER, USER_ID, input)).resolves.toEqual(
      created
    );
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ owner: NOTE_OWNER }));
  });

  it("creates a board-owned attachment when within limits", async () => {
    mocks.findKanbanBoardByIdForVault.mockResolvedValue({ id: "board-1" });
    const input = createAttachmentInput();
    const owner = { kind: "board" as const, id: "board-1" };
    const created = { id: input.id, boardId: "board-1" };
    mocks.create.mockResolvedValue(created);
    await expect(noteAttachmentService.create(owner, USER_ID, input)).resolves.toEqual(created);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ owner }));
  });

  it("rejects unsupported encryption version", async () => {
    const input = { ...createAttachmentInput(), blobEncryptionVersion: "legacy" as typeof ENCRYPTION_VERSION };
    await expect(noteAttachmentService.create(NOTE_OWNER, USER_ID, input)).rejects.toThrow(
      /Unsupported encryption version/
    );
  });

  it("getById returns attachment and maps missing table to not found", async () => {
    mocks.findByIdForOwner.mockResolvedValue({ id: ATTACHMENT_ID });
    await expect(
      noteAttachmentService.getById(NOTE_OWNER, ATTACHMENT_ID, USER_ID)
    ).resolves.toEqual({ id: ATTACHMENT_ID });

    mocks.findByIdForOwner.mockRejectedValue({ code: "42P01" });
    await expect(
      noteAttachmentService.getById(NOTE_OWNER, ATTACHMENT_ID, USER_ID)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("delete returns success and maps missing table to unavailable", async () => {
    mocks.delete.mockResolvedValue(true);
    await expect(
      noteAttachmentService.delete(NOTE_OWNER, ATTACHMENT_ID, USER_ID)
    ).resolves.toEqual({ success: true });

    mocks.delete.mockRejectedValue({ code: "42P01" });
    await expect(
      noteAttachmentService.delete(NOTE_OWNER, ATTACHMENT_ID, USER_ID)
    ).rejects.toBeInstanceOf(AttachmentsUnavailableError);
  });

  it("getStorageUsage returns totals when attachments table exists", async () => {
    mocks.sumCiphertextBytesByVaultId.mockResolvedValue(2048);
    mocks.sumNoteCiphertextBytesByVaultId.mockResolvedValue(4096);
    mocks.sumStandaloneBoardCiphertextBytesByVaultId.mockResolvedValue(1000);
    await expect(noteAttachmentService.getStorageUsage(USER_ID)).resolves.toMatchObject({
      notesCiphertextBytes: 5096,
      attachmentsCiphertextBytes: 2048,
      totalCiphertextBytes: 7144,
      partial: false,
    });
  });
});
