import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/trusted-devices/route";
import { DELETE } from "@/app/api/trusted-devices/[id]/route";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireSessionUser: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  revoke: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: mocks.requireSessionUser,
}));

vi.mock("@/server/services/trusted-device-service", () => ({
  trustedDeviceService: {
    list: mocks.list,
    create: mocks.create,
    revoke: mocks.revoke,
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

  it("DELETE revokes device", async () => {
    mocks.revoke.mockResolvedValue({ success: true });
    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "device-1" }),
    });
    expect(res.status).toBe(200);
  });
});
