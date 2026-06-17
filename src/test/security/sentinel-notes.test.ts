import { describe, it, expect, vi, beforeEach } from "vitest";
import { encryptNote } from "@/lib/crypto-client/notes";
import { generateUserVaultKey, setSessionVaultKey } from "@/lib/crypto-client/vault";
import { noteService } from "@/server/services/note-service";
import { safeLogger } from "@/lib/logger";
import { SENTINEL_PHRASE } from "./sentinel-phrase.test";
import { USER_ID, NOTE_ID } from "@/test/helpers/fixtures";

const noteMocks = vi.hoisted(() => ({
  create: vi.fn(),
  findVaultByUserId: vi.fn(),
}));

vi.mock("@/server/repositories/note-repository", () => ({
  noteRepository: {
    create: noteMocks.create,
  },
}));

vi.mock("@/server/repositories/vault-repository", () => ({
  vaultRepository: { findVaultByUserId: noteMocks.findVaultByUserId },
}));

vi.mock("@/server/repositories/audit-repository", () => ({
  auditRepository: { record: vi.fn() },
}));

describe("sentinel phrase notes runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    noteMocks.findVaultByUserId.mockResolvedValue({ id: "vault-1" });
  });

  it("never exposes sentinel plaintext through note service or API JSON", async () => {
    const vaultKey = await generateUserVaultKey();
    setSessionVaultKey(vaultKey);

    const encrypted = await encryptNote(USER_ID, NOTE_ID, {
      title: SENTINEL_PHRASE,
      body: SENTINEL_PHRASE,
    });

    const createInput = { id: NOTE_ID, ...encrypted };

    noteMocks.create.mockImplementation(async (data: Record<string, unknown>) => ({
      id: data.id,
      vaultId: "vault-1",
      encryptedMetadata: data.encryptedMetadata,
      encryptedBody: data.encryptedBody,
      encryptedWrappedNoteKey: data.encryptedWrappedNoteKey,
      bodyEncryptionVersion: data.bodyEncryptionVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    }));

    const note = await noteService.create(USER_ID, createInput);
    const apiJson = JSON.stringify(note);
    const persistedJson = JSON.stringify(noteMocks.create.mock.calls[0][0]);

    expect(apiJson).not.toContain(SENTINEL_PHRASE);
    expect(persistedJson).not.toContain(SENTINEL_PHRASE);

    safeLogger.info("note created", { endpoint: `/api/notes/${NOTE_ID}` });
    const logOutput = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().map(String).join("\n");
    expect(logOutput).not.toContain(SENTINEL_PHRASE);
  });
});
