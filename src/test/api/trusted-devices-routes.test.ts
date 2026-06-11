import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/trusted-devices/route";
import { PATCH, DELETE } from "@/app/api/trusted-devices/[id]/route";
import { POST as removePost } from "@/app/api/trusted-devices/[id]/remove/route";
import { POST as touchPost } from "@/app/api/trusted-devices/touch/route";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireSessionUser: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  rename: vi.fn(),
  touchLastUsed: vi.fn(),
  revoke: vi.fn(),
  removeRevoked: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: mocks.requireSessionUser,
}));

vi.mock("@/server/services/trusted-device-service", () => ({
  trustedDeviceService: {
    list: mocks.list,
    create: mocks.create,
    rename: mocks.rename,
    touchLastUsed: mocks.touchLastUsed,
    revoke: mocks.revoke,
    removeRevoked: mocks.removeRevoked,
  },
  NotFoundError: class NotFoundError extends Error {
    name = "NotFoundError";
  },
}));

describe("trusted devices API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSessionUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
  });

  it("GET lists devices", async () => {
    mocks.list.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("POST creates device", async () => {
    mocks.create.mockResolvedValue({ id: "device-1" });
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          deviceName: "Chrome",
          encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
        }),
      })
    );
    expect(res.status).toBe(201);
  });

  it("PATCH renames device", async () => {
    mocks.rename.mockResolvedValue({ id: "device-1", deviceName: "Home MacBook" });
    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ deviceName: "Home MacBook" }),
      }),
      { params: Promise.resolve({ id: "device-1" }) }
    );
    expect(res.status).toBe(200);
  });

  it("POST touch updates last used", async () => {
    mocks.touchLastUsed.mockResolvedValue({ updated: true, state: "active" });
    const res = await touchPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ deviceId: "550e8400-e29b-41d4-a716-446655440000" }),
      })
    );
    expect(res.status).toBe(200);
  });

  it("DELETE revokes device", async () => {
    mocks.revoke.mockResolvedValue({ success: true });
    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "device-1" }),
    });
    expect(res.status).toBe(200);
  });

  it("POST remove deletes revoked device record", async () => {
    mocks.removeRevoked.mockResolvedValue({ success: true });
    const res = await removePost(new Request("http://localhost"), {
      params: Promise.resolve({ id: "device-1" }),
    });
    expect(res.status).toBe(200);
    expect(mocks.removeRevoked).toHaveBeenCalledWith("device-1", USER_ID);
  });
});
