import { describe, it, expect, vi, beforeEach } from "vitest";
import { noteService, NotFoundError, AadValidationError } from "@/server/services/note-service";
import { createNoteInput, NOTE_ID, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  findByVaultId: vi.fn(),
  findByIdForVault: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
  findVaultByUserId: vi.fn(),
  record: vi.fn(),
}));

vi.mock("@/server/repositories/note-repository", () => ({
  noteRepository: {
    create: mocks.create,
    findByVaultId: mocks.findByVaultId,
    findByIdForVault: mocks.findByIdForVault,
    update: mocks.update,
    softDelete: mocks.softDelete,
  },
}));

vi.mock("@/server/repositories/vault-repository", () => ({
  vaultRepository: { findVaultByUserId: mocks.findVaultByUserId },
}));

vi.mock("@/server/repositories/audit-repository", () => ({
  auditRepository: { record: mocks.record },
}));

describe("note service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findVaultByUserId.mockResolvedValue({ id: "vault-1" });
  });

  it("lists notes for user vault", async () => {
    mocks.findByVaultId.mockResolvedValue([{ id: NOTE_ID }]);
    await expect(noteService.list(USER_ID)).resolves.toEqual([{ id: NOTE_ID }]);
  });

  it("creates encrypted notes", async () => {
    mocks.create.mockResolvedValue({ id: NOTE_ID });
    const input = createNoteInput();
    await expect(noteService.create(USER_ID, input)).resolves.toEqual({ id: NOTE_ID });
  });

  it("rejects unsupported encryption version", async () => {
    const input = { ...createNoteInput(), bodyEncryptionVersion: "legacy" as "enc-v1" };
    await expect(noteService.create(USER_ID, input)).rejects.toThrow("Unsupported encryption version");
  });

  it("rejects create when AAD resourceId mismatches", async () => {
    const input = createNoteInput();
    input.encryptedMetadata.aad.resourceId = "00000000-0000-0000-0000-000000000099";
    await expect(noteService.create(USER_ID, input)).rejects.toThrow("resourceId");
  });

  it("rejects oversized payloads", async () => {
    const input = createNoteInput();
    input.encryptedBody.ciphertext = "x".repeat(120_000);
    await expect(noteService.create(USER_ID, input)).rejects.toThrow("size limit");
  });

  it("getById throws when missing", async () => {
    mocks.findByIdForVault.mockResolvedValue(null);
    await expect(noteService.getById(NOTE_ID, USER_ID)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("update returns not found when repository update fails", async () => {
    mocks.findByIdForVault.mockResolvedValue({ id: NOTE_ID });
    mocks.update.mockResolvedValue(null);
    await expect(noteService.update(NOTE_ID, USER_ID, {})).rejects.toBeInstanceOf(NotFoundError);
  });

  it("delete records audit event", async () => {
    mocks.softDelete.mockResolvedValue({ id: NOTE_ID });
    await noteService.delete(NOTE_ID, USER_ID);
    expect(mocks.record).toHaveBeenCalledWith("note_deleted", USER_ID, expect.any(Object));
  });

  it("rejects create when AAD userId mismatches", async () => {
    const input = createNoteInput();
    input.encryptedMetadata.aad.userId = "00000000-0000-0000-0000-000000000099";
    await expect(noteService.create(USER_ID, input)).rejects.toBeInstanceOf(AadValidationError);
  });

  it("throws when vault not initialized", async () => {
    mocks.findVaultByUserId.mockResolvedValue(null);
    await expect(noteService.list(USER_ID)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("getById returns a note", async () => {
    mocks.findByIdForVault.mockResolvedValue({ id: NOTE_ID });
    await expect(noteService.getById(NOTE_ID, USER_ID)).resolves.toEqual({ id: NOTE_ID });
  });

  it("updates encrypted note fields", async () => {
    mocks.findByIdForVault.mockResolvedValue({ id: NOTE_ID });
    mocks.update.mockResolvedValue({ id: NOTE_ID });
    const input = createNoteInput();
    await noteService.update(NOTE_ID, USER_ID, {
      encryptedMetadata: input.encryptedMetadata,
      encryptedBody: input.encryptedBody,
      encryptedWrappedNoteKey: input.encryptedWrappedNoteKey,
      bodyEncryptionVersion: "enc-v1",
    });
    expect(mocks.update).toHaveBeenCalledWith(
      NOTE_ID,
      "vault-1",
      expect.objectContaining({
        encryptedMetadata: input.encryptedMetadata,
        bodyEncryptionVersion: "enc-v1",
      })
    );
  });
});
