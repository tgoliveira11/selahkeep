import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/kanban/route";
import { BOARD_ID, createKanbanBoardInput, NOTE_ID, USER_ID } from "@/test/helpers/fixtures";

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

vi.mock("@/server/services/kanban-service", () => ({
  kanbanService: {
    list: mocks.list,
    create: mocks.create,
  },
  KanbanUnavailableError: class KanbanUnavailableError extends Error {
    name = "KanbanUnavailableError";
  },
}));

function jsonRequest(body: unknown, method = "POST") {
  return new Request("http://localhost/api/kanban", { method, body: JSON.stringify(body) });
}

describe("kanban API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSessionUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
  });

  it("GET lists boards", async () => {
    mocks.list.mockResolvedValue([{ id: BOARD_ID }]);
    const res = await GET(new Request("http://localhost/api/kanban"));
    expect(res.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith(USER_ID, {});
  });

  it("GET passes noteId and scope filters", async () => {
    mocks.list.mockResolvedValue([]);
    const res = await GET(
      new Request(`http://localhost/api/kanban?noteId=${NOTE_ID}&scope=standalone`)
    );
    expect(res.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith(USER_ID, {
      noteId: NOTE_ID,
      scope: "standalone",
    });
  });

  it("GET rejects malformed query values", async () => {
    const res = await GET(new Request("http://localhost/api/kanban?scope=note"));
    expect(res.status).toBe(400);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("POST creates an encrypted board", async () => {
    mocks.create.mockResolvedValue({ id: BOARD_ID });
    const res = await POST(jsonRequest(createKanbanBoardInput()));
    expect(res.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(USER_ID, createKanbanBoardInput());
  });

  it("POST rejects plaintext board fields", async () => {
    const res = await POST(jsonRequest({ board: { cards: [] } }));
    expect(res.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("POST rejects malformed encrypted payload", async () => {
    const res = await POST(jsonRequest({ id: "not-a-uuid" }));
    expect(res.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("POST maps unavailable kanban storage to 503", async () => {
    const { KanbanUnavailableError } = await import("@/server/services/kanban-service");
    mocks.create.mockRejectedValue(new KanbanUnavailableError("unavailable"));
    const res = await POST(jsonRequest(createKanbanBoardInput()));
    expect(res.status).toBe(503);
  });
});
