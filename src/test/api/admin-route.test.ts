import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/users/[id]/route";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireSessionUser: vi.fn(),
  getUserSummary: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: mocks.requireSessionUser,
}));

vi.mock("@/server/services/admin-service", () => ({
  adminService: {
    getUserSummary: mocks.getUserSummary,
  },
}));

describe("admin API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSessionUser.mockResolvedValue({ id: USER_ID, email: "admin@example.com" });
  });

  it("returns user summary metadata", async () => {
    mocks.getUserSummary.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
      letterCount: 2,
    });
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: USER_ID }),
    });
    expect(res.status).toBe(200);
  });

  it("returns 403 for other users", async () => {
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "other-user" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 when user missing", async () => {
    mocks.getUserSummary.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: USER_ID }),
    });
    expect(res.status).toBe(404);
  });
});
