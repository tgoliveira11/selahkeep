import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/notes/[id]/route";
import { createNoteInput, NOTE_ID, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireFullyAuthenticatedUser: vi.fn(),
  getById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireFullyAuthenticatedUser: mocks.requireFullyAuthenticatedUser,
  UnauthorizedError: class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  },
}));

vi.mock("@/server/services/note-service", () => ({
  noteService: {
    getById: mocks.getById,
    update: mocks.update,
    delete: mocks.delete,
  },
  NotFoundError: class NotFoundError extends Error {
    name = "NotFoundError";
  },
}));

describe("notes id API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
  });

  it("GET returns a note", async () => {
    mocks.getById.mockResolvedValue({ id: NOTE_ID });
    const res = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: NOTE_ID }) });
    expect(res.status).toBe(200);
  });

  it("PUT updates encrypted note", async () => {
    mocks.update.mockResolvedValue({ id: NOTE_ID });
    const input = createNoteInput();
    const res = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ encryptedBody: input.encryptedBody }),
      }),
      { params: Promise.resolve({ id: NOTE_ID }) }
    );
    expect(res.status).toBe(200);
  });

  it("PUT rejects plaintext body", async () => {
    const res = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ body: "plaintext" }),
      }),
      { params: Promise.resolve({ id: NOTE_ID }) }
    );
    expect(res.status).toBe(400);
  });

  it("DELETE soft-deletes note", async () => {
    mocks.delete.mockResolvedValue({ success: true });
    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: NOTE_ID }) });
    expect(res.status).toBe(200);
  });

  it("GET returns 404 when missing", async () => {
    const { NotFoundError } = await import("@/server/services/note-service");
    mocks.getById.mockRejectedValue(new NotFoundError("Note not found"));
    const res = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: NOTE_ID }) });
    expect(res.status).toBe(404);
  });
});
