import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readModuleSource } from "@/test/helpers/module-source";
import { POST as registerPost } from "@/app/api/auth/register/route";
import { GET as accountGet } from "@/app/api/account/route";

const mocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  create: vi.fn(),
  requireSessionUser: vi.fn(),
  getDeletionRequirements: vi.fn(),
}));

vi.mock("@/server/repositories/user-repository", () => ({
  userRepository: {
    findByEmail: mocks.findByEmail,
    create: mocks.create,
  },
}));

vi.mock("@/server/policies/password-hashing", () => ({
  hashPassword: vi.fn(
    async () => "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
  ),
}));

vi.mock("@/server/services/account-auth-service", () => ({
  accountAuthService: {
    sendVerificationEmailForUser: vi.fn(async () => ({ alreadyVerified: false })),
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: mocks.requireSessionUser,
}));

vi.mock("@/server/services/account-service", () => ({
  accountService: {
    getDeletionRequirements: mocks.getDeletionRequirements,
  },
}));

describe("auth password API boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects registration when password is sent in the query string", async () => {
    const res = await registerPost(
      new Request("http://localhost/api/auth/register?password=secret", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      })
    );
    expect(res.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("does not echo password or password_hash in registration responses", async () => {
    mocks.findByEmail.mockResolvedValue(null);
    mocks.create.mockResolvedValue({
      id: "user-1",
      email: "new@example.com",
      passwordHash: "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
    });

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

  it("does not expose password_hash from account deletion requirements", async () => {
    mocks.requireSessionUser.mockResolvedValue({ id: "user-1", email: "user@example.com" });
    mocks.getDeletionRequirements.mockResolvedValue({
      requiresPassword: true,
      authProvider: "credentials",
      confirmationPhrase: "DELETE MY ACCOUNT",
    });

    const res = await accountGet();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).not.toHaveProperty("password");
    expect(body).not.toHaveProperty("passwordHash");
  });

  it("verifies credentials only on the server with bcrypt helpers", () => {
    const authLoginService = readModuleSource("src/server/services/auth-login-service.ts");
    expect(authLoginService).toContain("verifyPassword");
    expect(authLoginService).not.toMatch(/passwordHash\s*===/);
    expect(authLoginService).not.toContain("bcrypt.compare");
  });

  it("guards auth routes against URL password transport", () => {
    const registerRoute = readFileSync(
      join(process.cwd(), "src/app/api/auth/register/route.ts"),
      "utf8"
    );
    const accountRoute = readFileSync(join(process.cwd(), "src/app/api/account/route.ts"), "utf8");

    expect(registerRoute).toContain("assertPasswordNotInUrl");
    expect(accountRoute).toContain("assertPasswordNotInUrl");
  });
});
