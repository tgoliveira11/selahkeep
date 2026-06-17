import { describe, it, expect, vi, beforeEach } from "vitest";
import { adminService } from "@/server/services/admin-service";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  findVaultByUserId: vi.fn(),
  countByVaultId: vi.fn(),
  findActiveEnvelopesByUserId: vi.fn(),
}));

vi.mock("@/server/repositories/user-repository", () => ({
  userRepository: { findById: mocks.findById },
}));

vi.mock("@/server/repositories/note-repository", () => ({
  noteRepository: { countByVaultId: mocks.countByVaultId },
}));

vi.mock("@/server/repositories/vault-repository", () => ({
  vaultRepository: {
    findVaultByUserId: mocks.findVaultByUserId,
    findActiveEnvelopesByUserId: mocks.findActiveEnvelopesByUserId,
  },
}));

describe("admin service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null for unknown users", async () => {
    mocks.findById.mockResolvedValue(null);
    await expect(adminService.getUserSummary(USER_ID)).resolves.toBeNull();
  });

  it("returns metadata without note content", async () => {
    mocks.findById.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
      authProvider: "credentials",
      createdAt: new Date("2024-01-01"),
    });
    mocks.findVaultByUserId.mockResolvedValue({ id: "vault-1" });
    mocks.countByVaultId.mockResolvedValue(3);
    mocks.findActiveEnvelopesByUserId.mockResolvedValue([{ method: "recovery_code" }]);

    await expect(adminService.getUserSummary(USER_ID)).resolves.toEqual({
      id: USER_ID,
      email: "user@example.com",
      authProvider: "credentials",
      createdAt: new Date("2024-01-01"),
      noteCount: 3,
      recoveryMethods: ["recovery_code"],
    });
  });
});
