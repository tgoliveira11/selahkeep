import { lockVaultSession, unlockVaultSession } from "@/lib/crypto-client/vault-session";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { encryptNote } from "@/lib/crypto-client/notes";import { generateUserVaultKey } from "@/lib/crypto-client/vault";
import { noteService } from "@/server/services/note-service";
import { adminService } from "@/server/services/admin-service";
import { safeLogger } from "@/lib/logger";
import { SENTINEL_PHRASE } from "./sentinel-phrase.test";
import { USER_ID, NOTE_ID } from "@/test/helpers/fixtures";
import { ENCRYPTION_VERSION } from "@/lib/validation/encrypted-payload";

const noteMocks = vi.hoisted(() => ({
  create: vi.fn(),
  countByVaultId: vi.fn(),
}));

const userMocks = vi.hoisted(() => ({
  findById: vi.fn(),
}));

const vaultMocks = vi.hoisted(() => ({
  findActiveEnvelopesByUserId: vi.fn(),
  findVaultByUserId: vi.fn(),
}));

vi.mock("@/server/repositories/note-repository", () => ({
  noteRepository: {
    create: noteMocks.create,
    countByVaultId: noteMocks.countByVaultId,
  },
}));

vi.mock("@/server/repositories/user-repository", () => ({
  userRepository: { findById: userMocks.findById },
}));


vi.mock("@/server/repositories/vault-repository", () => ({
  vaultRepository: {
    findActiveEnvelopesByUserId: vaultMocks.findActiveEnvelopesByUserId,
    findVaultByUserId: vaultMocks.findVaultByUserId,
  },
}));

vi.mock("@/server/repositories/audit-repository", () => ({
  auditRepository: { record: vi.fn() },
}));

describe("sentinel phrase runtime integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("never exposes sentinel plaintext through service, API, admin, or logs", async () => {
    const vaultKey = await generateUserVaultKey();
    await unlockVaultSession(vaultKey);

    const encrypted = await encryptNote(USER_ID, NOTE_ID, {
      title: SENTINEL_PHRASE,
      body: SENTINEL_PHRASE,
    });

    const createInput = {
      id: NOTE_ID,
      ...encrypted,
    };

    noteMocks.create.mockImplementation(async (data: Record<string, unknown>) => ({
      id: data.id,
      vaultId: "vault-1",
      encryptedMetadata: data.encryptedMetadata,
      encryptedBody: data.encryptedBody,
      encryptedWrappedNoteKey: data.encryptedWrappedNoteKey,
      bodyEncryptionVersion: data.bodyEncryptionVersion,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    }));

    vaultMocks.findVaultByUserId.mockResolvedValue({ id: "vault-1" });

    const note = await noteService.create(USER_ID, createInput);
    const apiJson = JSON.stringify(note);
    const persistedJson = JSON.stringify(noteMocks.create.mock.calls[0][0]);

    expect(apiJson).not.toContain(SENTINEL_PHRASE);
    expect(persistedJson).not.toContain(SENTINEL_PHRASE);
    expect(createInput.encryptedMetadata.ciphertext).not.toEqual(SENTINEL_PHRASE);

    userMocks.findById.mockResolvedValue({
      id: USER_ID,
      email: "sentinel@test.local",
      authProvider: "credentials",
      createdAt: new Date(),
    });
    vaultMocks.findVaultByUserId.mockResolvedValue({ id: "vault-1" });
    noteMocks.countByVaultId.mockResolvedValue(1);
    vaultMocks.findActiveEnvelopesByUserId.mockResolvedValue([]);

    const adminSummary = await adminService.getUserSummary(USER_ID);
    expect(JSON.stringify(adminSummary)).not.toContain(SENTINEL_PHRASE);

    safeLogger.info("note created", {
      endpoint: `/api/notes/${NOTE_ID}`,
      encryptionVersion: ENCRYPTION_VERSION,
    });
    safeLogger.error("simulated failure", {
      endpoint: `/api/notes/${NOTE_ID}`,
      errorCode: "test",
    });

    const logOutput = [
      ...(console.log as ReturnType<typeof vi.fn>).mock.calls.flat(),
      ...(console.error as ReturnType<typeof vi.fn>).mock.calls.flat(),
    ]
      .map(String)
      .join("\n");

    expect(logOutput).not.toContain(SENTINEL_PHRASE);
  });
});
