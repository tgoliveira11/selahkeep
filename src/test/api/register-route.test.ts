import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/register/route";

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

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async () => "hashed-password"),
  },
}));

describe("register API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new user", async () => {
    mocks.findByEmail.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: "user-1", email: "new@example.com" });
    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", password: "password123" }),
      })
    );
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ id: "user-1", email: "new@example.com" });
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
