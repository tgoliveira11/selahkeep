import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE, GET, PUT } from "@/app/api/kanban/[boardId]/route";
import { BOARD_ID, updateKanbanBoardInput, USER_ID } from "@/test/helpers/fixtures";

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

vi.mock("@/server/services/kanban-service", () => ({
  kanbanService: {
    getById: mocks.getById,
    update: mocks.update,
    delete: mocks.delete,
  },
  NotFoundError: class NotFoundError extends Error {
    name = "NotFoundError";
  },
}));

function jsonRequest(body: unknown, method = "PUT") {
  return new Request("http://localhost/api/kanban/board", {
    method,
    body: JSON.stringify(body),
  });
}

describe("kanban board id API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
  });

  it("GET returns a board", async () => {
    mocks.getById.mockResolvedValue({ id: BOARD_ID });
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ boardId: BOARD_ID }),
    });
    expect(res.status).toBe(200);
    expect(mocks.getById).toHaveBeenCalledWith(BOARD_ID, USER_ID);
  });

  it("PUT updates an encrypted board", async () => {
    mocks.update.mockResolvedValue({ id: BOARD_ID });
    const input = updateKanbanBoardInput();
    const res = await PUT(jsonRequest(input), {
      params: Promise.resolve({ boardId: BOARD_ID }),
    });
    expect(res.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(BOARD_ID, USER_ID, input);
  });

  it("PUT rejects plaintext board fields", async () => {
    const res = await PUT(jsonRequest({ cards: [] }), {
      params: Promise.resolve({ boardId: BOARD_ID }),
    });
    expect(res.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("PUT rejects malformed encrypted payload", async () => {
    const res = await PUT(jsonRequest({ id: "not-a-uuid" }), {
      params: Promise.resolve({ boardId: BOARD_ID }),
    });
    expect(res.status).toBe(400);
  });

  it("DELETE removes a board", async () => {
    mocks.delete.mockResolvedValue({ success: true });
    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ boardId: BOARD_ID }),
    });
    expect(res.status).toBe(200);
    expect(mocks.delete).toHaveBeenCalledWith(BOARD_ID, USER_ID);
  });

  it("GET returns 404 when missing", async () => {
    const { NotFoundError } = await import("@/server/services/kanban-service");
    mocks.getById.mockRejectedValue(new NotFoundError("Kanban board not found"));
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ boardId: BOARD_ID }),
    });
    expect(res.status).toBe(404);
  });
});
