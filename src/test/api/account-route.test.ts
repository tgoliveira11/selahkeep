import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE, GET } from "@/app/api/account/route";
import { USER_ID } from "@/test/helpers/fixtures";
import { ACCOUNT_DELETION_CONFIRMATION_PHRASE } from "@/lib/account-deletion";

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: vi.fn(async () => ({ id: USER_ID, email: "user@test.local" })),
}));

vi.mock("@/server/services/account-service", () => ({
  accountService: {
    getDeletionRequirements: vi.fn(async () => ({
      requiresPassword: true,
      authProvider: "credentials",
      confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
    })),
    deleteAccount: vi.fn(async () => ({ success: true })),
  },
}));

describe("/api/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns deletion requirements", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.confirmationPhrase).toBe(ACCOUNT_DELETION_CONFIRMATION_PHRASE);
  });

  it("deletes the authenticated account with confirmation payload", async () => {
    const { accountService } = await import("@/server/services/account-service");
    const res = await DELETE(
      new Request("http://localhost/api/account", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "127.0.0.1",
        },
        body: JSON.stringify({
          confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
          password: "secret",
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(accountService.deleteAccount).toHaveBeenCalledWith(
      USER_ID,
      {
        confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
        password: "secret",
      },
      "127.0.0.1"
    );
  });
});
