/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { signOutAccount } from "@/lib/auth/sign-out-client";

const mocks = vi.hoisted(() => ({
  defaultSignOutAccount: vi.fn(),
}));

vi.mock("@tgoliveira/secure-auth/react/client", () => ({
  defaultSignOutAccount: mocks.defaultSignOutAccount,
}));

describe("signOutAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.defaultSignOutAccount.mockResolvedValue(undefined);
  });

  it("delegates sign-out to the secure-auth package helper", async () => {
    await signOutAccount();
    expect(mocks.defaultSignOutAccount).toHaveBeenCalledTimes(1);
  });
});
