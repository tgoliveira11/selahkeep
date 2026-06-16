import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { POST as registerPost } from "@/app/api/auth/register/route";
import { GET as accountGet } from "@/app/api/account/route";

const mocks = vi.hoisted(() => ({
  registerPost: vi.fn(),
  accountGet: vi.fn(),
}));

vi.mock("@/lib/secure-auth", () => ({
  secureAuth: {
    routes: {
      register: { POST: mocks.registerPost },
      account: { GET: mocks.accountGet },
    },
  },
}));

describe("auth password API boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not echo password in registration responses (delegated)", async () => {
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

    const res = await registerPost(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", password: "password123" }),
      })
    );

    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body).toEqual({
      id: "user-1",
      email: "new@example.com",
      requiresEmailVerification: true,
    });
    expect(JSON.stringify(body)).not.toContain("password");
    expect(JSON.stringify(body)).not.toContain("passwordHash");
  });

  it("does not expose password_hash from account deletion requirements (delegated)", async () => {
    mocks.accountGet.mockResolvedValue(
      new Response(
        JSON.stringify({
          requiresPassword: true,
          authProvider: "credentials",
          confirmationPhrase: "DELETE MY ACCOUNT",
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const res = await accountGet();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).not.toHaveProperty("password");
    expect(body).not.toHaveProperty("passwordHash");
  });

  it("URL password transport guard lives in the secure-auth package", () => {
    const secureAuthIndex = readFileSync(
      join(process.cwd(), "node_modules/@tgoliveira/secure-auth/dist/next/index.js"),
      "utf8"
    );
    expect(secureAuthIndex).toContain("assertPasswordNotInUrl");
  });

  it("password hashing is owned by the secure-auth package", () => {
    const secureAuthIndex = readFileSync(
      join(process.cwd(), "node_modules/@tgoliveira/secure-auth/dist/next/index.js"),
      "utf8"
    );
    expect(secureAuthIndex).toContain("hashPassword");
  });
});
