import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/notes/route";
import { createNoteInput, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireFullyAuthenticatedUser: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireFullyAuthenticatedUser: mocks.requireFullyAuthenticatedUser,
  UnauthorizedError: class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  },
}));

vi.mock("@/server/services/note-service", () => ({
  noteService: {
    list: mocks.list,
    create: mocks.create,
  },
  NotFoundError: class NotFoundError extends Error {
    name = "NotFoundError";
  },
}));

describe("notes API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
  });

  it("GET returns user notes", async () => {
    mocks.list.mockResolvedValue([{ id: "note-1" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([{ id: "note-1" }]);
  });

  it("GET requires authentication", async () => {
    const { UnauthorizedError } = await import("@/lib/auth/session");
    mocks.requireFullyAuthenticatedUser.mockRejectedValue(new UnauthorizedError("Authentication required"));
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("POST creates encrypted note", async () => {
    mocks.create.mockResolvedValue({ id: "note-1" });
    const res = await POST(
      new Request("http://localhost/api/notes", {
        method: "POST",
        body: JSON.stringify(createNoteInput()),
      })
    );
    expect(res.status).toBe(201);
  });

  it("POST rejects plaintext fields", async () => {
    const res = await POST(
      new Request("http://localhost/api/notes", {
        method: "POST",
        body: JSON.stringify({ title: "secret", body: "secret" }),
      })
    );
    expect(res.status).toBe(400);
  });
});
