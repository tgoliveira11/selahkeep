import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  requireFullyAuthenticatedUser: vi.fn(async () => ({ id: "00000000-0000-4000-8000-000000000099" })),
}));

const setupMock = vi.fn();
vi.mock("@/server/services/vault-service", () => ({
  vaultService: {
    setup: setupMock,
  },
}));

describe("POST /api/vault/setup", () => {
  beforeEach(() => {
    setupMock.mockReset();
    setupMock.mockResolvedValue({ id: "vault-id" });
  });

  it("rejects plaintext vault fields", async () => {
    const { POST } = await import("@/app/api/vault/setup/route");
    const response = await POST(
      new Request("http://localhost/api/vault/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaultPassword: "secret" }),
      })
    );
    expect(response.status).toBe(400);
    expect(setupMock).not.toHaveBeenCalled();
  });

  it("accepts encrypted setup payload shape", async () => {
    const payload = {
      vaultVersion: "vault-v2",
      encryptedVaultSettings: {
        version: "enc-v1",
        alg: "AES-GCM",
        iv: "aXY",
        ciphertext: "Y2lwaGVy",
        aad: {
          userId: "00000000-0000-4000-8000-000000000099",
          resourceId: "00000000-0000-4000-8000-000000000099",
          field: "vault_settings",
        },
      },
      encryptedVaultIndex: {
        version: "enc-v1",
        alg: "AES-GCM",
        iv: "aXY",
        ciphertext: "aW5kZXg",
        aad: {
          userId: "00000000-0000-4000-8000-000000000099",
          resourceId: "00000000-0000-4000-8000-000000000099",
          field: "vault_index",
        },
      },
      envelopes: [],
    };
    const { POST } = await import("@/app/api/vault/setup/route");
    const response = await POST(
      new Request("http://localhost/api/vault/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/Invalid vault setup/);
  });
});
