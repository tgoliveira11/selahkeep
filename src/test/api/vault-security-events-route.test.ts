import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/vault/security-events/route";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireSessionUser: vi.fn(),
  listEvents: vi.fn(),
  recordClientEvent: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: mocks.requireSessionUser,
  UnauthorizedError: class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  },
}));

vi.mock("@/server/services/vault-security-service", () => ({
  vaultSecurityService: {
    listEvents: mocks.listEvents,
    recordClientEvent: mocks.recordClientEvent,
  },
}));

describe("vault security events API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSessionUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
  });

  it("GET returns safe events", async () => {
    mocks.listEvents.mockResolvedValue([
      {
        id: "evt-1",
        eventType: "vault_unlocked",
        label: "Vault unlocked with vault password",
        createdAt: "2026-06-16T14:32:00.000Z",
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      events: [
        {
          id: "evt-1",
          eventType: "vault_unlocked",
          label: "Vault unlocked with vault password",
          createdAt: "2026-06-16T14:32:00.000Z",
        },
      ],
    });
  });

  it("POST records allowed client events", async () => {
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          eventType: "recovery_phrase_test_succeeded",
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(mocks.recordClientEvent).toHaveBeenCalledWith(
      USER_ID,
      "recovery_phrase_test_succeeded",
      undefined
    );
  });

  it("POST rejects recovery phrase in body", async () => {
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          eventType: "recovery_phrase_test_succeeded",
          recoveryPhrase: "secret words must never be accepted",
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(mocks.recordClientEvent).toHaveBeenCalledWith(
      USER_ID,
      "recovery_phrase_test_succeeded",
      undefined
    );
  });

  it("POST rejects invalid event types", async () => {
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ eventType: "letter_deleted" }),
      })
    );
    expect(res.status).toBe(400);
  });
});
