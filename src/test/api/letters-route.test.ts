import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/letters/route";
import { createLetterInput, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireSessionUser: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: mocks.requireSessionUser,
  UnauthorizedError: class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  },
}));

vi.mock("@/server/services/letter-service", () => ({
  letterService: {
    list: mocks.list,
    create: mocks.create,
  },
  NotFoundError: class NotFoundError extends Error {
    name = "NotFoundError";
  },
}));

describe("letters API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSessionUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
  });

  it("GET returns user letters", async () => {
    mocks.list.mockResolvedValue([{ id: "letter-1" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([{ id: "letter-1" }]);
  });

  it("GET requires authentication", async () => {
    const { UnauthorizedError } = await import("@/lib/auth/session");
    mocks.requireSessionUser.mockRejectedValue(new UnauthorizedError("Authentication required"));
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("POST creates encrypted letter", async () => {
    mocks.create.mockResolvedValue({ id: "letter-1" });
    const res = await POST(
      new Request("http://localhost/api/letters", {
        method: "POST",
        body: JSON.stringify(createLetterInput()),
      })
    );
    expect(res.status).toBe(201);
  });

  it("POST rejects plaintext fields", async () => {
    const res = await POST(
      new Request("http://localhost/api/letters", {
        method: "POST",
        body: JSON.stringify({ title: "secret", body: "secret" }),
      })
    );
    expect(res.status).toBe(400);
  });
});
