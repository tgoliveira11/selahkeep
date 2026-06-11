import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  accountSessionService,
  resetSessionTouchCacheForTests,
} from "@/server/services/account-session-service";
import { USER_ID } from "@/test/helpers/fixtures";

const SESSION_ID = "660e8400-e29b-41d4-a716-446655440001";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  findActiveByUserId: vi.fn(),
  isActive: vi.fn(),
  revokeById: vi.fn(),
  revokeAllExcept: vi.fn(),
  revokeAllForUser: vi.fn(),
  touchLastUsed: vi.fn(),
  updateMetadata: vi.fn(),
  record: vi.fn(),
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/server/repositories/account-session-repository", () => ({
  accountSessionRepository: {
    create: mocks.create,
    findActiveByUserId: mocks.findActiveByUserId,
    isActive: mocks.isActive,
    revokeById: mocks.revokeById,
    revokeAllExcept: mocks.revokeAllExcept,
    revokeAllForUser: mocks.revokeAllForUser,
    touchLastUsed: mocks.touchLastUsed,
    updateMetadata: mocks.updateMetadata,
  },
}));

vi.mock("@/server/repositories/audit-repository", () => ({
  auditRepository: { record: mocks.record },
}));

vi.mock("@/server/policies/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
}));

const sampleRow = {
  id: SESSION_ID,
  userId: USER_ID,
  authMethod: "password",
  browser: "Chrome",
  platform: "macOS",
  deviceType: "desktop",
  ipHash: "hash",
  ipMasked: "187.45.12.xxx",
  userAgentHash: "uahash",
  createdAt: new Date("2026-01-01T10:00:00Z"),
  lastUsedAt: new Date("2026-01-02T12:00:00Z"),
  expiresAt: new Date("2026-02-01T10:00:00Z"),
  revokedAt: null,
};

describe("accountSessionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSessionTouchCacheForTests();
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret");
    mocks.enforceRateLimit.mockResolvedValue(undefined);
    mocks.create.mockResolvedValue(sampleRow);
    mocks.isActive.mockResolvedValue(true);
    mocks.touchLastUsed.mockResolvedValue(sampleRow);
  });

  it("maps providers to auth methods", () => {
    expect(accountSessionService.mapProviderToAuthMethod("google")).toBe("google");
    expect(accountSessionService.mapProviderToAuthMethod("apple")).toBe("apple");
    expect(accountSessionService.mapProviderToAuthMethod("azure-ad")).toBe("microsoft");
    expect(accountSessionService.mapProviderToAuthMethod("credentials")).toBe("password");
    expect(accountSessionService.mapProviderToAuthMethod("login-token", "passkey")).toBe("passkey");
    expect(accountSessionService.mapProviderToAuthMethod("login-token", "bogus")).toBe("unknown");
    expect(accountSessionService.mapProviderToAuthMethod("oauth")).toBe("unknown");
  });

  it("rejects missing session identifiers", async () => {
    await expect(accountSessionService.assertSessionActive(undefined, USER_ID)).resolves.toBe(false);
    await expect(accountSessionService.assertSessionActive(SESSION_ID, undefined)).resolves.toBe(
      false
    );
  });

  it("lists sessions for the user with current marker", async () => {
    mocks.findActiveByUserId.mockResolvedValue([sampleRow]);
    const result = await accountSessionService.listSessions(USER_ID, SESSION_ID);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]?.isCurrent).toBe(true);
    expect(result.sessions[0]?.ipMasked).toBe("187.45.12.xxx");
  });

  it("lists sessions without a current marker when id is unknown", async () => {
    mocks.findActiveByUserId.mockResolvedValue([sampleRow]);
    const result = await accountSessionService.listSessions(USER_ID);
    expect(result.sessions[0]?.isCurrent).toBe(false);
  });

  it("fills display defaults for missing metadata", async () => {
    mocks.findActiveByUserId.mockResolvedValue([
      {
        ...sampleRow,
        browser: null,
        platform: null,
        deviceType: null,
        ipMasked: null,
      },
    ]);
    const result = await accountSessionService.listSessions(USER_ID);
    expect(result.sessions[0]).toMatchObject({
      browser: "unknown",
      platform: "unknown",
      deviceType: "unknown",
      ipMasked: "partially hidden",
    });
  });

  it("accepts active sessions", async () => {
    mocks.isActive.mockResolvedValue(true);
    await expect(accountSessionService.assertSessionActive(SESSION_ID, USER_ID)).resolves.toBe(
      true
    );
  });

  it("revokes a specific session", async () => {
    mocks.revokeById.mockResolvedValue(sampleRow);
    const result = await accountSessionService.revokeSession(USER_ID, SESSION_ID, "other-id");
    expect(result.revoked).toBe(true);
    expect(result.signOut).toBe(false);
  });

  it("flags sign out when revoking current session", async () => {
    mocks.revokeById.mockResolvedValue(sampleRow);
    const result = await accountSessionService.revokeSession(USER_ID, SESSION_ID, SESSION_ID);
    expect(result.signOut).toBe(true);
  });

  it("revokes all other sessions", async () => {
    mocks.revokeAllExcept.mockResolvedValue([{ id: "other" }]);
    const result = await accountSessionService.revokeOtherSessions(USER_ID, SESSION_ID);
    expect(result.revokedCount).toBe(1);
  });

  it("throttles last-used updates", async () => {
    vi.stubEnv("SESSION_LAST_USED_UPDATE_INTERVAL_SECONDS", "300");
    await accountSessionService.touchSessionThrottled(SESSION_ID, USER_ID);
    await accountSessionService.touchSessionThrottled(SESSION_ID, USER_ID);
    expect(mocks.touchLastUsed).toHaveBeenCalledTimes(1);
  });

  it("rejects inactive sessions", async () => {
    mocks.isActive.mockResolvedValue(false);
    await expect(accountSessionService.assertSessionActive(SESSION_ID, USER_ID)).resolves.toBe(
      false
    );
  });

  it("creates a session without request metadata", async () => {
    await accountSessionService.createSession({
      userId: USER_ID,
      authMethod: "google",
    });
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        authMethod: "google",
        browser: undefined,
      })
    );
  });

  it("creates a session with request metadata", async () => {
    const request = new Request("http://localhost", {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "x-forwarded-for": "187.45.12.99",
      },
    });
    await accountSessionService.createSession({
      userId: USER_ID,
      authMethod: "password",
      request,
    });
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        browser: "Chrome",
        platform: "macOS",
        ipMasked: "187.45.12.xxx",
      })
    );
  });

  it("enriches session metadata from request", async () => {
    const request = new Request("http://localhost", {
      headers: {
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile Safari",
        "x-real-ip": "10.0.0.5",
      },
    });
    mocks.updateMetadata.mockResolvedValue(sampleRow);
    await accountSessionService.enrichFromRequest(SESSION_ID, USER_ID, request);
    expect(mocks.updateMetadata).toHaveBeenCalled();
  });

  it("revokes the current session on sign out", async () => {
    mocks.revokeById.mockResolvedValue({ id: SESSION_ID });
    const result = await accountSessionService.revokeOnSignOut(USER_ID, SESSION_ID);
    expect(result.revoked).toBe(true);
    expect(mocks.revokeById).toHaveBeenCalledWith(SESSION_ID, USER_ID);
    expect(mocks.record).toHaveBeenCalledWith(
      "session_revoked",
      USER_ID,
      expect.objectContaining({ endpoint: "/api/auth/signout" })
    );
  });

  it("skips sign-out revoke when session id is missing or already revoked", async () => {
    mocks.revokeById.mockResolvedValue(null);
    await expect(accountSessionService.revokeOnSignOut(USER_ID, SESSION_ID)).resolves.toEqual({
      revoked: false,
    });
    await expect(accountSessionService.revokeOnSignOut(USER_ID, undefined)).resolves.toEqual({
      revoked: false,
    });
    expect(mocks.revokeById).toHaveBeenCalledTimes(1);
  });

  it("revokes all sessions", async () => {
    mocks.revokeAllForUser.mockResolvedValue([sampleRow, { id: "other" }]);
    const result = await accountSessionService.revokeAllSessions(USER_ID);
    expect(result.signOut).toBe(true);
    expect(result.revokedCount).toBe(2);
  });

  it("throws when revoking unknown session", async () => {
    mocks.revokeById.mockResolvedValue(null);
    await expect(
      accountSessionService.revokeSession(USER_ID, "missing", SESSION_ID)
    ).rejects.toMatchObject({ name: "NotFoundError" });
  });
});
