import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/kanban/[boardId]/versions/[versionId]/route";
import { BOARD_ID, KANBAN_VERSION_ID, USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireFullyAuthenticatedUser: vi.fn(),
  getById: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireFullyAuthenticatedUser: mocks.requireFullyAuthenticatedUser,
  UnauthorizedError: class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  },
}));

vi.mock("@/server/services/kanban-version-service", () => ({
  kanbanVersionService: {
    getById: mocks.getById,
  },
  NotFoundError: class NotFoundError extends Error {
    name = "NotFoundError";
  },
}));

describe("kanban version id API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
  });

  it("GET returns a version snapshot", async () => {
    mocks.getById.mockResolvedValue({ id: KANBAN_VERSION_ID });
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ boardId: BOARD_ID, versionId: KANBAN_VERSION_ID }),
    });
    expect(res.status).toBe(200);
    expect(mocks.getById).toHaveBeenCalledWith(BOARD_ID, KANBAN_VERSION_ID, USER_ID);
  });

  it("GET returns 404 when missing", async () => {
    const { NotFoundError } = await import("@/server/services/kanban-version-service");
    mocks.getById.mockRejectedValue(new NotFoundError("Kanban version not found"));
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ boardId: BOARD_ID, versionId: KANBAN_VERSION_ID }),
    });
    expect(res.status).toBe(404);
  });
});
