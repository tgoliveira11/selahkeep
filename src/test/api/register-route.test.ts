import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/register/route";
import { hashPassword } from "@/server/policies/password-hashing";

const mocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  create: vi.fn(),
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

describe("register API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new user with a bcrypt password hash", async () => {
    mocks.findByEmail.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: "user-1", email: "new@example.com" });
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
    expect(hashPassword).toHaveBeenCalledWith("password123");
    expect(mocks.create).toHaveBeenCalledWith({
      email: "new@example.com",
      authProvider: "credentials",
      passwordHash: "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
    });
  });

  it("rejects invalid input", async () => {
    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "bad", password: "short" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects duplicate email", async () => {
    mocks.findByEmail.mockResolvedValue({ id: "existing" });
    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "exists@example.com", password: "password123" }),
      })
    );
    expect(res.status).toBe(409);
  });
});
