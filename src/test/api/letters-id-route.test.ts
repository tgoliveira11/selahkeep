import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/letters/[id]/route";
import { createLetterInput, LETTER_ID, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireSessionUser: vi.fn(),
  getById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: mocks.requireSessionUser,
  UnauthorizedError: class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  },
}));

vi.mock("@/server/services/letter-service", () => ({
  letterService: {
    getById: mocks.getById,
    update: mocks.update,
    delete: mocks.delete,
  },
  NotFoundError: class NotFoundError extends Error {
    name = "NotFoundError";
  },
}));

describe("letter by id API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSessionUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
  });

  const params = Promise.resolve({ id: LETTER_ID });

  it("GET returns a letter", async () => {
    mocks.getById.mockResolvedValue({ id: LETTER_ID });
    const res = await GET(new Request("http://localhost"), { params });
    expect(res.status).toBe(200);
  });

  it("PUT updates encrypted content", async () => {
    mocks.update.mockResolvedValue({ id: LETTER_ID });
    const res = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify(createLetterInput()),
      }),
      { params }
    );
    expect(res.status).toBe(200);
  });

  it("PUT rejects plaintext", async () => {
    const res = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ body: "plaintext" }),
      }),
      { params }
    );
    expect(res.status).toBe(400);
  });

  it("DELETE removes a letter", async () => {
    mocks.delete.mockResolvedValue({ success: true });
    const res = await DELETE(new Request("http://localhost"), { params });
    expect(res.status).toBe(200);
  });

  it("maps not found and unauthorized errors", async () => {
    const { NotFoundError } = await import("@/server/services/letter-service");
    const { UnauthorizedError } = await import("@/lib/auth/session");
    mocks.getById.mockRejectedValue(new NotFoundError("Letter not found"));
    expect((await GET(new Request("http://localhost"), { params })).status).toBe(404);

    mocks.requireSessionUser.mockRejectedValue(new UnauthorizedError("Authentication required"));
    expect((await DELETE(new Request("http://localhost"), { params })).status).toBe(401);
  });
});
