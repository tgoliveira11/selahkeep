import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as vaultInitPost } from "@/app/api/vault/init/route";
import { POST as registerPost } from "@/app/api/passkeys/register/route";

const sessionUser = { id: "550e8400-e29b-41d4-a716-446655440000", email: "user@example.com" };

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: vi.fn(async () => sessionUser),
  UnauthorizedError: class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  },
}));

vi.mock("@/server/services/vault-service", () => ({
  vaultService: { init: vi.fn() },
  ConflictError: class ConflictError extends Error {
    name = "ConflictError";
  },
}));

vi.mock("@/server/services/passkey-service", () => ({
  passkeyService: {
    getRegistrationOptions: vi.fn(),
    verifyRegistration: vi.fn(),
  },
}));

describe("API validation error paths", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects invalid vault init payload", async () => {
    const res = await vaultInitPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({ bad: true }) })
    );
    expect(res.status).toBe(400);
  });

  it("rejects invalid passkey register payload", async () => {
    const res = await registerPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({ action: "bad" }) })
    );
    expect(res.status).toBe(400);
  });
});
