import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "@/app/api/passkeys/route";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireSessionUser: vi.fn(),
  removeAll: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: mocks.requireSessionUser,
  UnauthorizedError: class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  },
}));

vi.mock("@/server/services/passkey-service", () => ({
  passkeyService: {
    removeAll: mocks.removeAll,
  },
  NotFoundError: class NotFoundError extends Error {
    name = "NotFoundError";
  },
}));

describe("DELETE /api/passkeys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSessionUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
  });

  it("removes passkeys for the authenticated user", async () => {
    mocks.removeAll.mockResolvedValue({ success: true });
    const res = await DELETE();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });
  });
});
