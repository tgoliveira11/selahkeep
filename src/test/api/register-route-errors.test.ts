import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/register/route";

vi.mock("@/server/repositories/user-repository", () => ({
  userRepository: {
    findByEmail: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/server/policies/password-hashing", () => ({
  hashPassword: vi.fn(
    async () => "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
  ),
}));

describe("register route error mapping", () => {
  beforeEach(async () => {
    const { userRepository } = await import("@/server/repositories/user-repository");
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
  });

  it("maps database connection errors", async () => {
    const { userRepository } = await import("@/server/repositories/user-repository");
    vi.mocked(userRepository.create).mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      })
    );
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("Database unavailable"),
    });
  });

  it("maps missing DATABASE_URL configuration", async () => {
    const { userRepository } = await import("@/server/repositories/user-repository");
    vi.mocked(userRepository.create).mockRejectedValue(new Error("DATABASE_URL is not set"));
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      })
    );
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("DATABASE_URL"),
    });
  });

  it("maps missing schema errors", async () => {
    const { userRepository } = await import("@/server/repositories/user-repository");
    vi.mocked(userRepository.create).mockRejectedValue(
      new Error('relation "users" does not exist')
    );
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      })
    );
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("Run migrations"),
    });
  });

  it("rejects password in query string", async () => {
    const res = await POST(
      new Request("http://localhost/api/auth/register?password=secret", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("rate limits registration attempts", async () => {
    for (let i = 0; i < 10; i++) {
      await POST(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({ email: `user${i}@example.com`, password: "password123" }),
        })
      );
    }
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "blocked@example.com", password: "password123" }),
      })
    );
    expect(res.status).toBe(429);
  });
});
