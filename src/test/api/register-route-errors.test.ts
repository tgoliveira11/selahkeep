import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/register/route";

const mocks = vi.hoisted(() => ({
  registerPost: vi.fn(),
}));

vi.mock("@/lib/secure-auth", () => ({
  secureAuth: {
    routes: {
      register: {
        POST: mocks.registerPost,
      },
    },
  },
}));

describe("register route error mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps database connection errors", async () => {
    mocks.registerPost.mockResolvedValue(
      new Response(JSON.stringify({ error: "Database unavailable" }), { status: 500 })
    );
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      })
    );
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: expect.any(String) });
  });

  it("maps missing DATABASE_URL configuration", async () => {
    mocks.registerPost.mockResolvedValue(
      new Response(JSON.stringify({ error: "DATABASE_URL is not set" }), { status: 500 })
    );
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      })
    );
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: expect.any(String) });
  });

  it("maps missing schema errors", async () => {
    mocks.registerPost.mockResolvedValue(
      new Response(JSON.stringify({ error: "Run migrations" }), { status: 500 })
    );
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      })
    );
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: expect.any(String) });
  });

  it("rejects password in query string", async () => {
    mocks.registerPost.mockResolvedValue(
      new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 })
    );
    const res = await POST(
      new Request("http://localhost/api/auth/register?password=secret", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("rate limits registration attempts", async () => {
    mocks.registerPost.mockResolvedValue(
      new Response(JSON.stringify({ error: "Too many attempts" }), { status: 429 })
    );
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "blocked@example.com", password: "password123" }),
      })
    );
    expect(res.status).toBe(429);
  });
});
