import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH } from "@/app/api/vault/index/route";
import { encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireFullyAuthenticatedUser: vi.fn(),
  getIndex: vi.fn(),
  updateIndex: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireFullyAuthenticatedUser: mocks.requireFullyAuthenticatedUser,
  UnauthorizedError: class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  },
}));

vi.mock("@/server/services/vault-service", () => ({
  vaultService: {
    getIndex: mocks.getIndex,
    updateIndex: mocks.updateIndex,
  },
  NotFoundError: class NotFoundError extends Error {
    name = "NotFoundError";
  },
}));

describe("vault index API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
  });

  it("GET returns encrypted index", async () => {
    const index = encryptedPayload("vault_index", USER_ID);
    mocks.getIndex.mockResolvedValue({ encryptedVaultIndex: index });
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ encryptedVaultIndex: index });
  });

  it("PATCH updates encrypted index", async () => {
    const index = encryptedPayload("vault_index", USER_ID);
    mocks.updateIndex.mockResolvedValue({ encryptedVaultIndex: index });
    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ encryptedVaultIndex: index }),
      })
    );
    expect(res.status).toBe(200);
  });
});
