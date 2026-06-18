import { describe, it, expect, vi, beforeEach } from "vitest";
import { vaultSecurityService } from "@/modules/vault/services/vault-security-service";

const mocks = vi.hoisted(() => ({
  listForUser: vi.fn(),
  record: vi.fn(),
}));

vi.mock("@/modules/audit/repositories/audit-repository", () => ({
  auditRepository: {
    listForUser: mocks.listForUser,
    record: mocks.record,
  },
}));

describe("vaultSecurityService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists safe event labels for user", async () => {
    mocks.listForUser.mockResolvedValue([
      {
        id: "1",
        eventType: "vault_unlocked",
        metadata: { method: "password" },
        createdAt: new Date("2026-06-16T14:32:00.000Z"),
      },
    ]);

    const events = await vaultSecurityService.listEvents("user-1");
    expect(events[0]?.label).toBe("Vault unlocked with vault password");
    expect(events[0]?.eventType).toBe("vault_unlocked");
  });

  it("records client events with allowed method metadata only", async () => {
    await vaultSecurityService.recordClientEvent("user-1", "recovery_phrase_test_succeeded");
    expect(mocks.record).toHaveBeenCalledWith("recovery_phrase_test_succeeded", "user-1", {});

    await vaultSecurityService.recordClientEvent("user-1", "vault_unlocked", {
      method: "passkey_prf",
    });
    expect(mocks.record).toHaveBeenCalledWith("vault_unlocked", "user-1", {
      method: "passkey_prf",
    });
  });

  it("rejects invalid client event types", async () => {
    await expect(
      vaultSecurityService.recordClientEvent(
        "user-1",
        "recovery_phrase_replaced" as "vault_unlocked"
      )
    ).rejects.toThrow(/invalid/i);
  });

  it("rejects unsafe method labels", async () => {
    await expect(
      vaultSecurityService.recordClientEvent("user-1", "vault_unlocked", {
        method: "recovery_phrase_plaintext",
      })
    ).rejects.toThrow(/invalid/i);
  });
});
