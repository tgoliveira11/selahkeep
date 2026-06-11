/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { signOutAccount } from "@/lib/auth/sign-out-client";

const mocks = vi.hoisted(() => ({
  revokeCurrent: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/api-client/account-sessions", () => ({
  accountSessionsApi: {
    revokeCurrent: mocks.revokeCurrent,
  },
}));

vi.mock("next-auth/react", () => ({
  signOut: mocks.signOut,
}));

describe("signOutAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signOut.mockResolvedValue(undefined);
  });

  it("revokes the current session before clearing auth", async () => {
    mocks.revokeCurrent.mockResolvedValue({ revoked: true });
    await signOutAccount();
    expect(mocks.revokeCurrent).toHaveBeenCalled();
    expect(mocks.signOut).toHaveBeenCalledWith({ redirect: false });
  });

  it("still signs out when revoke-current fails", async () => {
    mocks.revokeCurrent.mockRejectedValue(new Error("network"));
    await signOutAccount();
    expect(mocks.signOut).toHaveBeenCalledWith({ redirect: false });
  });
});
