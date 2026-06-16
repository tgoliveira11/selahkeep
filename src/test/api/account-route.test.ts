import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE, GET } from "@/app/api/account/route";
import { USER_ID } from "@/test/helpers/fixtures";
import { ACCOUNT_DELETION_CONFIRMATION_PHRASE } from "@/lib/account-deletion";

const mocks = vi.hoisted(() => ({
  accountGet: vi.fn(),
  accountDelete: vi.fn(),
}));

vi.mock("@/lib/secure-auth", () => ({
  secureAuth: {
    routes: {
      account: {
        GET: mocks.accountGet,
        DELETE: mocks.accountDelete,
      },
    },
  },
}));

describe("/api/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns deletion requirements", async () => {
    mocks.accountGet.mockResolvedValue(
      new Response(
        JSON.stringify({
          requiresPassword: true,
          authProvider: "credentials",
          confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.confirmationPhrase).toBe(ACCOUNT_DELETION_CONFIRMATION_PHRASE);
  });

  it("deletes the authenticated account with confirmation payload", async () => {
    mocks.accountDelete.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
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
    expect(mocks.accountDelete).toHaveBeenCalledTimes(1);
  });
});
