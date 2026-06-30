import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/kanban/[boardId]/versions/route";
import {
  BOARD_ID,
  createKanbanVersionInput,
  KANBAN_VERSION_ID,
  USER_ID,
} from "@/test/helpers/fixtures";

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

vi.mock("@/server/services/kanban-version-service", () => ({
  kanbanVersionService: {
    list: mocks.list,
    create: mocks.create,
  },
  KanbanVersionsUnavailableError: class KanbanVersionsUnavailableError extends Error {
    name = "KanbanVersionsUnavailableError";
  },
}));

function jsonRequest(body: unknown, method = "POST") {
  return new Request("http://localhost/api/kanban/board/versions", {
    method,
    body: JSON.stringify(body),
  });
}

describe("kanban versions API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSessionUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
  });

  it("GET lists versions", async () => {
    mocks.list.mockResolvedValue([{ id: KANBAN_VERSION_ID, versionNumber: 1 }]);
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ boardId: BOARD_ID }),
    });
    expect(res.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith(BOARD_ID, USER_ID);
  });

  it("POST creates a version", async () => {
    mocks.create.mockResolvedValue({ id: KANBAN_VERSION_ID, versionNumber: 1 });
    const input = createKanbanVersionInput();
    const res = await POST(jsonRequest(input), {
      params: Promise.resolve({ boardId: BOARD_ID }),
    });
    expect(res.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(BOARD_ID, USER_ID, input);
  });

  it("POST rejects plaintext board fields", async () => {
    const res = await POST(jsonRequest({ title: "plaintext" }), {
      params: Promise.resolve({ boardId: BOARD_ID }),
    });
    expect(res.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("POST rejects malformed encrypted payload", async () => {
    const res = await POST(jsonRequest({ id: "not-a-uuid" }), {
      params: Promise.resolve({ boardId: BOARD_ID }),
    });
    expect(res.status).toBe(400);
  });

  it("POST maps unavailable version storage to 503", async () => {
    const { KanbanVersionsUnavailableError } = await import(
      "@/server/services/kanban-version-service"
    );
    mocks.create.mockRejectedValue(new KanbanVersionsUnavailableError("unavailable"));
    const res = await POST(jsonRequest(createKanbanVersionInput()), {
      params: Promise.resolve({ boardId: BOARD_ID }),
    });
    expect(res.status).toBe(503);
  });
});
