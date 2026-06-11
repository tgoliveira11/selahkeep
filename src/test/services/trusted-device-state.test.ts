import { describe, it, expect, vi, beforeEach } from "vitest";
import { trustedDeviceService } from "@/server/services/trusted-device-service";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  findActiveByClientDeviceId: vi.fn(),
  findRevokedByClientDeviceId: vi.fn(),
}));

vi.mock("@/server/repositories/trusted-device-repository", () => ({
  trustedDeviceRepository: {
    findActiveByClientDeviceId: mocks.findActiveByClientDeviceId,
    findRevokedByClientDeviceId: mocks.findRevokedByClientDeviceId,
  },
}));

describe("trusted device client state", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns active, revoked, and not_registered states with device id", async () => {
    mocks.findActiveByClientDeviceId.mockResolvedValueOnce({ id: "device-1" });
    await expect(
      trustedDeviceService.getClientDeviceState(USER_ID, "660e8400-e29b-41d4-a716-446655440002")
    ).resolves.toEqual({ state: "active", trustedDeviceId: "device-1" });

    mocks.findActiveByClientDeviceId.mockResolvedValueOnce(null);
    mocks.findRevokedByClientDeviceId.mockResolvedValueOnce({ id: "device-2" });
    await expect(
      trustedDeviceService.getClientDeviceState(USER_ID, "660e8400-e29b-41d4-a716-446655440002")
    ).resolves.toEqual({ state: "revoked", trustedDeviceId: "device-2" });

    mocks.findActiveByClientDeviceId.mockResolvedValueOnce(null);
    mocks.findRevokedByClientDeviceId.mockResolvedValueOnce(null);
    await expect(
      trustedDeviceService.getClientDeviceState(USER_ID, "660e8400-e29b-41d4-a716-446655440002")
    ).resolves.toEqual({ state: "not_registered" });
  });
});
