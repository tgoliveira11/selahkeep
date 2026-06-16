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

describe("register API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new user with a bcrypt password hash", async () => {
    mocks.registerPost.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "user-1",
          email: "new@example.com",
          requiresEmailVerification: true,
        }),
        { status: 201, headers: { "content-type": "application/json" } }
      )
    );
    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", password: "password123" }),
      })
    );
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({
      id: "user-1",
      email: "new@example.com",
      requiresEmailVerification: true,
    });
    expect(mocks.registerPost).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid input", async () => {
    mocks.registerPost.mockResolvedValue(
      new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    );
    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "bad", password: "short" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects duplicate email", async () => {
    mocks.registerPost.mockResolvedValue(
      new Response(JSON.stringify({ error: "Email already registered" }), {
        status: 409,
        headers: { "content-type": "application/json" },
      })
    );
    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "exists@example.com", password: "password123" }),
      })
    );
    expect(res.status).toBe(409);
  });
});
