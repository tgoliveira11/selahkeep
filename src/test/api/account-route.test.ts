import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "@/app/api/account/route";
import { USER_ID } from "@/test/helpers/fixtures";

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: vi.fn(async () => ({ id: USER_ID, email: "user@test.local" })),
}));

vi.mock("@/server/services/account-service", () => ({
  accountService: {
    deleteAccount: vi.fn(async () => ({ success: true })),
  },
}));

describe("DELETE /api/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes the authenticated account", async () => {
    const { accountService } = await import("@/server/services/account-service");
    const res = await DELETE(
      new Request("http://localhost/api/account", {
        method: "DELETE",
        headers: { "x-forwarded-for": "127.0.0.1" },
      })
    );
    expect(res.status).toBe(200);
    expect(accountService.deleteAccount).toHaveBeenCalledWith(USER_ID, "127.0.0.1");
  });
});
