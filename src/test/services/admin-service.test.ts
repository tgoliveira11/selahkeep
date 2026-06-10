import { describe, it, expect, vi, beforeEach } from "vitest";
import { adminService } from "@/server/services/admin-service";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  countByUserId: vi.fn(),
  countActiveByUserId: vi.fn(),
  findActiveEnvelopesByUserId: vi.fn(),
}));

vi.mock("@/server/repositories/user-repository", () => ({
  userRepository: { findById: mocks.findById },
}));

vi.mock("@/server/repositories/letter-repository", () => ({
  letterRepository: { countByUserId: mocks.countByUserId },
}));

vi.mock("@/server/repositories/trusted-device-repository", () => ({
  trustedDeviceRepository: { countActiveByUserId: mocks.countActiveByUserId },
}));

vi.mock("@/server/repositories/vault-repository", () => ({
  vaultRepository: { findActiveEnvelopesByUserId: mocks.findActiveEnvelopesByUserId },
}));

describe("admin service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null for unknown users", async () => {
    mocks.findById.mockResolvedValue(null);
    await expect(adminService.getUserSummary(USER_ID)).resolves.toBeNull();
  });

  it("returns metadata without letter content", async () => {
    mocks.findById.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
      authProvider: "credentials",
      createdAt: new Date("2024-01-01"),
    });
    mocks.countByUserId.mockResolvedValue(3);
    mocks.countActiveByUserId.mockResolvedValue(1);
    mocks.findActiveEnvelopesByUserId.mockResolvedValue([{ method: "recovery_code" }]);

    await expect(adminService.getUserSummary(USER_ID)).resolves.toEqual({
      id: USER_ID,
      email: "user@example.com",
      authProvider: "credentials",
      createdAt: new Date("2024-01-01"),
      letterCount: 3,
      trustedDeviceCount: 1,
      recoveryMethods: ["recovery_code"],
    });
  });
});
