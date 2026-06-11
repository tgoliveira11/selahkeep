import { describe, it, expect, vi, beforeEach } from "vitest";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const SESSION_ID = "660e8400-e29b-41d4-a716-446655440001";

const mocks = vi.hoisted(() => ({
  listSessions: vi.fn(),
  revokeSession: vi.fn(),
  revokeOtherSessions: vi.fn(),
  revokeAllSessions: vi.fn(),
  revokeCurrentSession: vi.fn(),
  enrichFromRequest: vi.fn(),
  requireFullyAuthenticatedUser: vi.fn(),
}));

vi.mock("@/server/services/account-session-service", () => ({
  accountSessionService: {
    listSessions: mocks.listSessions,
    revokeSession: mocks.revokeSession,
    revokeOtherSessions: mocks.revokeOtherSessions,
    revokeAllSessions: mocks.revokeAllSessions,
    revokeCurrentSession: mocks.revokeCurrentSession,
    enrichFromRequest: mocks.enrichFromRequest,
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireFullyAuthenticatedUser: mocks.requireFullyAuthenticatedUser,
  UnauthorizedError: class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  },
}));

describe("account sessions API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
      accountSessionId: SESSION_ID,
    });
  });

  it("GET /api/account/sessions requires authentication", async () => {
    const { UnauthorizedError } = await import("@/lib/auth/session");
    mocks.requireFullyAuthenticatedUser.mockRejectedValue(
      new UnauthorizedError("Authentication required")
    );
    const { GET } = await import("@/app/api/account/sessions/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET /api/account/sessions returns session list without raw tokens", async () => {
    mocks.listSessions.mockResolvedValue({
      sessions: [
        {
          id: SESSION_ID,
          isCurrent: true,
          authMethod: "password",
          browser: "Chrome",
          platform: "macOS",
          deviceType: "desktop",
          ipMasked: "187.45.12.xxx",
          createdAt: "2026-01-01T10:00:00.000Z",
          lastUsedAt: "2026-01-02T12:00:00.000Z",
          expiresAt: "2026-02-01T10:00:00.000Z",
        },
      ],
    });
    const { GET } = await import("@/app/api/account/sessions/route");
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.sessions[0].id).toBe(SESSION_ID);
    expect(JSON.stringify(body)).not.toMatch(/sessionToken|tokenHash/i);
  });

  it("DELETE /api/account/sessions/:id returns 404 when missing", async () => {
    mocks.revokeSession.mockRejectedValue(
      Object.assign(new Error("Session not found"), { name: "NotFoundError" })
    );
    const { DELETE } = await import("@/app/api/account/sessions/[id]/route");
    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("DELETE /api/account/sessions/:id revokes session", async () => {
    mocks.revokeSession.mockResolvedValue({ revoked: true, signOut: false });
    const { DELETE } = await import("@/app/api/account/sessions/[id]/route");
    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "other-session" }),
    });
    expect(res.status).toBe(200);
    expect(mocks.revokeSession).toHaveBeenCalledWith(
      USER_ID,
      "other-session",
      SESSION_ID,
      expect.any(String)
    );
  });

  it("POST /api/account/sessions/revoke-others keeps current session", async () => {
    mocks.revokeOtherSessions.mockResolvedValue({ revokedCount: 2 });
    const { POST } = await import("@/app/api/account/sessions/revoke-others/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    expect(res.status).toBe(200);
    expect(mocks.revokeOtherSessions).toHaveBeenCalledWith(USER_ID, SESSION_ID, expect.any(String));
  });

  it("POST /api/account/sessions/revoke-all signs out everywhere", async () => {
    mocks.revokeAllSessions.mockResolvedValue({ revokedCount: 3, signOut: true });
    const { POST } = await import("@/app/api/account/sessions/revoke-all/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revokedCount: 3, signOut: true });
  });

  it("POST /api/account/sessions/revoke-others requires current session id", async () => {
    const { UnauthorizedError } = await import("@/lib/auth/session");
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
      accountSessionId: undefined,
    });
    const { POST } = await import("@/app/api/account/sessions/revoke-others/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    expect(res.status).toBe(401);
    expect(mocks.revokeOtherSessions).not.toHaveBeenCalled();
    void UnauthorizedError;
  });

  it("POST /api/account/sessions/revoke-current revokes the active session", async () => {
    mocks.revokeCurrentSession.mockResolvedValue({ revoked: true });
    const { POST } = await import("@/app/api/account/sessions/revoke-current/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revoked: true });
    expect(mocks.revokeCurrentSession).toHaveBeenCalledWith(USER_ID, SESSION_ID);
  });

  it("POST /api/account/sessions/ping enriches current session", async () => {
    mocks.enrichFromRequest.mockResolvedValue(undefined);
    const { POST } = await import("@/app/api/account/sessions/ping/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "user-agent": "Mozilla/5.0 Chrome" },
      })
    );
    expect(res.status).toBe(200);
    expect(mocks.enrichFromRequest).toHaveBeenCalled();
  });

  it("POST /api/account/sessions/ping skips enrich without session id", async () => {
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
      accountSessionId: undefined,
    });
    const { POST } = await import("@/app/api/account/sessions/ping/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    expect(res.status).toBe(200);
    expect(mocks.enrichFromRequest).not.toHaveBeenCalled();
  });
});
