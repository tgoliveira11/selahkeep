import { describe, it, expect, vi, beforeEach } from "vitest";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const SESSION_ID = "660e8400-e29b-41d4-a716-446655440001";

const mocks = vi.hoisted(() => ({
  sessionsListGet: vi.fn(),
  sessionByIdDelete: vi.fn(),
  sessionsRevokeOthersPost: vi.fn(),
  sessionsRevokeAllPost: vi.fn(),
  sessionsRevokeCurrentPost: vi.fn(),
  sessionsPingPost: vi.fn(),
}));

vi.mock("@/lib/secure-auth", () => ({
  secureAuth: {
    routes: {
      sessionsList: { GET: mocks.sessionsListGet },
      sessionById: { DELETE: mocks.sessionByIdDelete },
      sessionsRevokeOthers: { POST: mocks.sessionsRevokeOthersPost },
      sessionsRevokeAll: { POST: mocks.sessionsRevokeAllPost },
      sessionsRevokeCurrent: { POST: mocks.sessionsRevokeCurrentPost },
      sessionsPing: { POST: mocks.sessionsPingPost },
    },
  },
}));

describe("account sessions API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/account/sessions requires authentication", async () => {
    const { GET } = await import("@/app/api/account/sessions/route");
    mocks.sessionsListGet.mockResolvedValue(new Response(JSON.stringify({}), { status: 401 }));
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET /api/account/sessions returns session list without raw tokens", async () => {
    mocks.sessionsListGet.mockResolvedValue(
      new Response(
        JSON.stringify({
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
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const { GET } = await import("@/app/api/account/sessions/route");
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.sessions[0].id).toBe(SESSION_ID);
    expect(JSON.stringify(body)).not.toMatch(/sessionToken|tokenHash/i);
  });

  it("DELETE /api/account/sessions/:id returns 404 when missing", async () => {
    mocks.sessionByIdDelete.mockResolvedValue(
      new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
    );
    const { DELETE } = await import("@/app/api/account/sessions/[id]/route");
    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("DELETE /api/account/sessions/:id revokes session", async () => {
    mocks.sessionByIdDelete.mockResolvedValue(
      new Response(JSON.stringify({ revoked: true, signOut: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    const { DELETE } = await import("@/app/api/account/sessions/[id]/route");
    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "other-session" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ revoked: true });
  });

  it("POST /api/account/sessions/revoke-others keeps current session", async () => {
    mocks.sessionsRevokeOthersPost.mockResolvedValue(
      new Response(JSON.stringify({ revokedCount: 2 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    const { POST } = await import("@/app/api/account/sessions/revoke-others/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ revokedCount: 2 });
  });

  it("POST /api/account/sessions/revoke-all signs out everywhere", async () => {
    mocks.sessionsRevokeAllPost.mockResolvedValue(
      new Response(JSON.stringify({ revokedCount: 3, signOut: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    const { POST } = await import("@/app/api/account/sessions/revoke-all/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revokedCount: 3, signOut: true });
  });

  it("POST /api/account/sessions/revoke-others requires current session id", async () => {
    mocks.sessionsRevokeOthersPost.mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    );
    const { POST } = await import("@/app/api/account/sessions/revoke-others/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    expect(res.status).toBe(401);
    expect(await res.json().catch(() => null)).toBeTruthy();
  });

  it("POST /api/account/sessions/revoke-current revokes the active session", async () => {
    mocks.sessionsRevokeCurrentPost.mockResolvedValue(
      new Response(JSON.stringify({ revoked: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    const { POST } = await import("@/app/api/account/sessions/revoke-current/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revoked: true });
  });

  it("POST /api/account/sessions/ping enriches current session", async () => {
    mocks.sessionsPingPost.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const { POST } = await import("@/app/api/account/sessions/ping/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "user-agent": "Mozilla/5.0 Chrome" },
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("POST /api/account/sessions/ping skips enrich without session id", async () => {
    mocks.sessionsPingPost.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const { POST } = await import("@/app/api/account/sessions/ping/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
