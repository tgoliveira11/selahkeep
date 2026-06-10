import { describe, it, expect, vi, beforeEach } from "vitest";
import { encryptLetter } from "@/lib/crypto-client/letters";
import { generateUserVaultKey, setSessionVaultKey } from "@/lib/crypto-client/vault";
import { letterService } from "@/server/services/letter-service";
import { adminService } from "@/server/services/admin-service";
import { safeLogger } from "@/lib/logger";
import { SENTINEL_PHRASE } from "./sentinel-phrase.test";
import { USER_ID, LETTER_ID } from "@/test/helpers/fixtures";
import { ENCRYPTION_VERSION } from "@/lib/validation/encrypted-payload";

const letterMocks = vi.hoisted(() => ({
  create: vi.fn(),
  countByUserId: vi.fn(),
}));

const userMocks = vi.hoisted(() => ({
  findById: vi.fn(),
}));

const deviceMocks = vi.hoisted(() => ({
  countActiveByUserId: vi.fn(),
}));

const vaultMocks = vi.hoisted(() => ({
  findActiveEnvelopesByUserId: vi.fn(),
}));

vi.mock("@/server/repositories/letter-repository", () => ({
  letterRepository: {
    create: letterMocks.create,
    countByUserId: letterMocks.countByUserId,
  },
}));

vi.mock("@/server/repositories/user-repository", () => ({
  userRepository: { findById: userMocks.findById },
}));

vi.mock("@/server/repositories/trusted-device-repository", () => ({
  trustedDeviceRepository: { countActiveByUserId: deviceMocks.countActiveByUserId },
}));

vi.mock("@/server/repositories/vault-repository", () => ({
  vaultRepository: { findActiveEnvelopesByUserId: vaultMocks.findActiveEnvelopesByUserId },
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
    setSessionVaultKey(vaultKey);

    const encrypted = await encryptLetter(
      USER_ID,
      LETTER_ID,
      SENTINEL_PHRASE,
      SENTINEL_PHRASE
    );

    const createInput = {
      id: LETTER_ID,
      ...encrypted,
    };

    letterMocks.create.mockImplementation(async (data: Record<string, unknown>) => ({
      id: data.id,
      userId: data.userId,
      encryptedTitle: data.encryptedTitle,
      encryptedBody: data.encryptedBody,
      encryptedLetterKey: data.encryptedLetterKey,
      encryptionVersion: data.encryptionVersion,
      answered: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const letter = await letterService.create(USER_ID, createInput);
    const apiJson = JSON.stringify(letter);
    const persistedJson = JSON.stringify(letterMocks.create.mock.calls[0][0]);

    expect(apiJson).not.toContain(SENTINEL_PHRASE);
    expect(persistedJson).not.toContain(SENTINEL_PHRASE);
    expect(createInput.encryptedTitle.ciphertext).not.toEqual(SENTINEL_PHRASE);

    userMocks.findById.mockResolvedValue({
      id: USER_ID,
      email: "sentinel@test.local",
      authProvider: "credentials",
      createdAt: new Date(),
    });
    letterMocks.countByUserId.mockResolvedValue(1);
    deviceMocks.countActiveByUserId.mockResolvedValue(0);
    vaultMocks.findActiveEnvelopesByUserId.mockResolvedValue([]);

    const adminSummary = await adminService.getUserSummary(USER_ID);
    expect(JSON.stringify(adminSummary)).not.toContain(SENTINEL_PHRASE);

    safeLogger.info("letter created", {
      endpoint: `/api/letters/${LETTER_ID}`,
      encryptionVersion: ENCRYPTION_VERSION,
    });
    safeLogger.error("simulated failure", {
      endpoint: `/api/letters/${LETTER_ID}`,
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
