import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  noteVersionService,
  NotFoundError,
  AadValidationError,
  VersionsUnavailableError,
} from "@/server/services/note-version-service";
import { createNoteVersionInput, NOTE_ID, USER_ID, VERSION_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  findVaultByUserId: vi.fn(),
  findByIdForVault: vi.fn(),
  create: vi.fn(),
  maxVersionNumber: vi.fn(),
  pruneBeyondLimit: vi.fn(),
  findByNoteId: vi.fn(),
  findByIdForNote: vi.fn(),
}));

vi.mock("@/server/repositories/vault-repository", () => ({
  vaultRepository: { findVaultByUserId: mocks.findVaultByUserId },
}));

vi.mock("@/server/repositories/note-repository", () => ({
  noteRepository: { findByIdForVault: mocks.findByIdForVault },
}));

vi.mock("@/server/repositories/note-version-repository", () => ({
  noteVersionRepository: {
    create: mocks.create,
    maxVersionNumber: mocks.maxVersionNumber,
    pruneBeyondLimit: mocks.pruneBeyondLimit,
    findByNoteId: mocks.findByNoteId,
    findByIdForNote: mocks.findByIdForNote,
  },
}));

vi.mock("@/lib/db/transaction", () => ({
  runInTransaction: (fn: (tx: unknown) => unknown) => fn({}),
}));

describe("note version service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findVaultByUserId.mockResolvedValue({ id: "vault-1" });
    mocks.findByIdForVault.mockResolvedValue({ id: NOTE_ID });
  });

  it("assigns the next version number and prunes beyond the limit", async () => {
    mocks.maxVersionNumber.mockResolvedValue(4);
    mocks.create.mockResolvedValue({ id: VERSION_ID, versionNumber: 5 });

    const result = await noteVersionService.create(NOTE_ID, USER_ID, createNoteVersionInput());

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ noteId: NOTE_ID, vaultId: "vault-1", versionNumber: 5 }),
      expect.anything()
    );
    expect(mocks.pruneBeyondLimit).toHaveBeenCalledWith(NOTE_ID, "vault-1", 50, expect.anything());
    expect(result).toEqual({ id: VERSION_ID, versionNumber: 5 });
  });

  it("starts at version 1 for the first snapshot", async () => {
    mocks.maxVersionNumber.mockResolvedValue(0);
    mocks.create.mockResolvedValue({ id: VERSION_ID, versionNumber: 1 });
    await noteVersionService.create(NOTE_ID, USER_ID, createNoteVersionInput());
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ versionNumber: 1 }),
      expect.anything()
    );
  });

  it("rejects when vault not initialized", async () => {
    mocks.findVaultByUserId.mockResolvedValue(null);
    await expect(
      noteVersionService.create(NOTE_ID, USER_ID, createNoteVersionInput())
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects when the parent note is missing", async () => {
    mocks.findByIdForVault.mockResolvedValue(null);
    await expect(
      noteVersionService.create(NOTE_ID, USER_ID, createNoteVersionInput())
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects unsupported encryption version", async () => {
    const input = { ...createNoteVersionInput(), bodyEncryptionVersion: "legacy" as "enc-v1" };
    await expect(noteVersionService.create(NOTE_ID, USER_ID, input)).rejects.toThrow(
      "Unsupported encryption version"
    );
  });

  it("rejects oversized payloads", async () => {
    const input = createNoteVersionInput();
    input.encryptedBody.ciphertext = "x".repeat(120_000);
    await expect(noteVersionService.create(NOTE_ID, USER_ID, input)).rejects.toThrow("size limit");
  });

  it("rejects AAD bound to the wrong version id", async () => {
    const input = createNoteVersionInput();
    input.encryptedMetadata.aad.resourceId = "00000000-0000-0000-0000-000000000099";
    await expect(noteVersionService.create(NOTE_ID, USER_ID, input)).rejects.toBeInstanceOf(
      AadValidationError
    );
  });

  it("rejects a wrapped key not bound to the note id", async () => {
    const input = createNoteVersionInput();
    input.encryptedWrappedNoteKey.aad.resourceId = "00000000-0000-0000-0000-000000000099";
    await expect(noteVersionService.create(NOTE_ID, USER_ID, input)).rejects.toBeInstanceOf(
      AadValidationError
    );
  });

  it("lists versions for a note", async () => {
    mocks.findByNoteId.mockResolvedValue([{ id: VERSION_ID, versionNumber: 1 }]);
    await expect(noteVersionService.list(NOTE_ID, USER_ID)).resolves.toEqual([
      { id: VERSION_ID, versionNumber: 1 },
    ]);
  });

  it("getById returns a version", async () => {
    mocks.findByIdForNote.mockResolvedValue({ id: VERSION_ID });
    await expect(noteVersionService.getById(NOTE_ID, VERSION_ID, USER_ID)).resolves.toEqual({
      id: VERSION_ID,
    });
  });

  it("getById throws when version missing", async () => {
    mocks.findByIdForNote.mockResolvedValue(null);
    await expect(
      noteVersionService.getById(NOTE_ID, VERSION_ID, USER_ID)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("list degrades to [] when the note_versions table is missing (42P01)", async () => {
    mocks.findByNoteId.mockRejectedValue({ code: "42P01" });
    await expect(noteVersionService.list(NOTE_ID, USER_ID)).resolves.toEqual([]);
  });

  it("create throws VersionsUnavailableError when the table is missing", async () => {
    mocks.maxVersionNumber.mockRejectedValue(
      Object.assign(new Error('relation "note_versions" does not exist'), { code: "42P01" })
    );
    await expect(
      noteVersionService.create(NOTE_ID, USER_ID, createNoteVersionInput())
    ).rejects.toBeInstanceOf(VersionsUnavailableError);
  });

  it("getById maps a missing table to NotFoundError", async () => {
    mocks.findByIdForNote.mockRejectedValue({ code: "42P01" });
    await expect(
      noteVersionService.getById(NOTE_ID, VERSION_ID, USER_ID)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rethrows unexpected repository errors", async () => {
    mocks.findByNoteId.mockRejectedValue(new Error("boom"));
    await expect(noteVersionService.list(NOTE_ID, USER_ID)).rejects.toThrow("boom");
  });
});
