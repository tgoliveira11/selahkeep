/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PasskeySettings } from "@/components/settings/passkey-settings";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/lib/api-client/passkey-account", () => ({
  passkeyAccountApi: {
    list: mocks.list,
    registerOptions: vi.fn(),
    registerVerify: vi.fn(),
    enableVaultUnlockOptions: vi.fn(),
    enableVaultUnlockVerify: vi.fn(),
    remove: mocks.remove,
  },
}));

vi.mock("@/lib/passkey/prf-support", () => ({
  detectPasskeyPrfSupport: vi.fn().mockResolvedValue("supported"),
}));

vi.mock("@/lib/crypto-client/vault", () => ({
  getSessionVaultKey: vi.fn().mockReturnValue(null),
}));

describe("PasskeySettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue({
      passkeys: [
        {
          id: "pk-1",
          friendlyName: "Laptop",
          createdAt: "2026-01-01T00:00:00.000Z",
          lastUsedAt: null,
          signInEnabled: true,
          vaultUnlockEnabled: false,
          prfSupported: null,
          capability: "sign-in-only",
          capabilityLabel: "Sign-in only",
        },
        {
          id: "pk-2",
          friendlyName: "Phone",
          createdAt: "2026-01-02T00:00:00.000Z",
          lastUsedAt: "2026-01-03T00:00:00.000Z",
          signInEnabled: true,
          vaultUnlockEnabled: true,
          prfSupported: true,
          capability: "sign-in-and-vault-unlock",
          capabilityLabel: "Sign-in + vault unlock",
        },
      ],
    });
  });

  it("lists passkeys with capability labels", async () => {
    render(<PasskeySettings userId={USER_ID} />);
    await waitFor(() => {
      expect(screen.getByText("Sign-in only")).toBeTruthy();
      expect(screen.getByText("Sign-in + vault unlock")).toBeTruthy();
    });
  });

  it("does not show sign-in-only passkey as vault recovery ready", async () => {
    render(<PasskeySettings userId={USER_ID} />);
    await waitFor(() => {
      expect(
        screen.getByText("This passkey is not set up to unlock your private letters.")
      ).toBeTruthy();
    });
  });
});
