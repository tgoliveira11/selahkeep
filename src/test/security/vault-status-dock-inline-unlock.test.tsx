/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { VaultStatusDock } from "@/features/vault/vault-status-dock";

const unlockFromVaultPassword = vi.fn();
const unlockFromPasskey = vi.fn();
const fetchSpy = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => "/settings/account"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    data: { user: { id: "user-1", email: "user@example.com" } },
    status: "authenticated",
    update: vi.fn(),
  })),
}));

vi.mock("@/features/vault/use-vault-client-status", () => ({
  useVaultClientStatus: vi.fn(),
}));

vi.mock("@/features/vault/use-vault", () => ({
  useVault: vi.fn(),
}));

vi.mock("@/features/vault/use-vault-dock-passkey-available", () => ({
  useVaultDockPasskeyAvailable: vi.fn(() => ({
    hasEnvelope: false,
    showPasskey: false,
    prfExplicitlyUnsupported: false,
  })),
}));

vi.mock("@/lib/crypto-client/vault-session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/crypto-client/vault-session")>();
  return {
    ...actual,
    subscribeVaultSession: vi.fn(() => () => {}),
    subscribeVaultActivityTimer: vi.fn(() => () => {}),
    getVaultAutoLockRemainingMs: vi.fn(() => 14 * 60 * 1000 + 32 * 1000),
    lockVaultSession: vi.fn(),
    lockVaultSessionManually: vi.fn(),
    registerVaultBeforeAutoLock: vi.fn(() => () => {}),
    isVaultManuallyLocked: vi.fn(() => false),
    wasVaultLockedByInactivity: vi.fn(() => false),
    registerVaultUnloadGuard: vi.fn(() => () => {}),
  };
});

function mockClientStatus(passkey = false) {
  return {
    status: "ready" as const,
    clientStatus: "locked" as const,
    setupPhase: "complete" as const,
    serverStatus: {
      initialized: true,
      setupPhase: "complete",
      setupComplete: true,
      vaultVersion: "vault-v2" as const,
      ltgSetupComplete: true,
      hasVaultPassword: true,
      availableUnlockMethods: {
        password: true,
        recoveryPhrase: true,
        passkey,
      },
    },
    recheck: vi.fn(),
  };
}

async function renderExpandedDock(
  vaultOverrides: {
    loading?: boolean;
    error?: string | null;
    passkey?: boolean;
    pathname?: string;
    passkeyAvailability?: {
      hasEnvelope: boolean;
      showPasskey: boolean;
      prfExplicitlyUnsupported: boolean;
    };
  } = {}
) {
  const { usePathname } = await import("next/navigation");
  const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
  const { useVault } = await import("@/features/vault/use-vault");
  const { useVaultDockPasskeyAvailable } = await import(
    "@/features/vault/use-vault-dock-passkey-available"
  );

  vi.mocked(usePathname).mockReturnValue(vaultOverrides.pathname ?? "/settings/account");
  vi.mocked(useVaultClientStatus).mockReturnValue(
    mockClientStatus(vaultOverrides.passkey ?? false)
  );
  vi.mocked(useVault).mockReturnValue({
    loading: vaultOverrides.loading ?? false,
    error: vaultOverrides.error ?? null,
    unlockFromVaultPassword,
    unlockFromRecoveryPhrase: vi.fn(),
    unlockFromPasskey,
    unlockFromRecoveryCode: vi.fn(),
    lockVault: vi.fn(),
  });
  vi.mocked(useVaultDockPasskeyAvailable).mockReturnValue(
    vaultOverrides.passkeyAvailability ?? {
      hasEnvelope: vaultOverrides.passkey ?? false,
      showPasskey: vaultOverrides.passkey ?? false,
      prfExplicitlyUnsupported: false,
    }
  );

  render(<VaultStatusDock />);
  fireEvent.click(screen.getByRole("button", { name: /expand vault status/i }));
}

describe("vault status dock inline unlock security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchSpy);
    unlockFromVaultPassword.mockResolvedValue(undefined);
    unlockFromPasskey.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not POST vault password to the server during inline unlock", async () => {
    await renderExpandedDock();
    fireEvent.change(screen.getByLabelText(/vault password/i), {
      target: { value: "SENTINEL-PRIVATE-LETTER-DO-NOT-STORE-PLAINTEXT-12345" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^unlock vault$/i }));

    expect(unlockFromVaultPassword).toHaveBeenCalledWith(
      "SENTINEL-PRIVATE-LETTER-DO-NOT-STORE-PLAINTEXT-12345"
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    const { useRouter } = await import("next/navigation");
    expect(vi.mocked(useRouter)().push).not.toHaveBeenCalled();
  });

  it("does not render recovery phrase tab or input in the dock", async () => {
    await renderExpandedDock();
    expect(screen.queryByRole("tab", { name: /recovery phrase/i })).toBeNull();
    expect(screen.queryByLabelText(/recovery phrase/i)).toBeNull();
  });

  it("shows passkey unlock only when configured and available", async () => {
    await renderExpandedDock({ passkey: false });
    expect(screen.queryByRole("tab", { name: /^passkey$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /unlock with passkey/i })).toBeNull();
  });

  it("shows passkey unlock when passkey_prf envelope exists and PRF is available", async () => {
    await renderExpandedDock({
      passkey: true,
      passkeyAvailability: {
        hasEnvelope: true,
        showPasskey: true,
        prfExplicitlyUnsupported: false,
      },
    });
    fireEvent.click(screen.getByRole("tab", { name: /^passkey$/i }));
    expect(screen.getByRole("button", { name: /unlock with passkey/i })).toBeTruthy();
  });

  it("hides active passkey option when PRF is explicitly unsupported", async () => {
    await renderExpandedDock({
      passkey: true,
      passkeyAvailability: {
        hasEnvelope: true,
        showPasskey: false,
        prfExplicitlyUnsupported: true,
      },
    });
    expect(screen.queryByRole("tab", { name: /^passkey$/i })).toBeNull();
    expect(screen.getByText(/passkey unlock is unavailable in this browser/i)).toBeTruthy();
  });

  it("keeps dock expanded when unlock error is shown", async () => {
    await renderExpandedDock({ error: "That password didn't unlock your vault." });
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByTestId("vault-status-dock")).toBeTruthy();
  });

  it("never renders note title, body, category, or tag in the dock", async () => {
    await renderExpandedDock();
    const dock = screen.getByTestId("vault-status-dock");
    expect(dock.textContent).not.toMatch(/category|#tag|note body|private letter/i);
  });

  it("does not mention trusted devices or letters domain", async () => {
    await renderExpandedDock();
    const dock = screen.getByTestId("vault-status-dock");
    expect(dock.textContent?.toLowerCase()).not.toContain("trusted device");
    expect(dock.textContent?.toLowerCase()).not.toContain("letter");
  });

  it("does not render duplicate unlock form on /vault/unlock", async () => {
    await renderExpandedDock({ pathname: "/vault/unlock" });
    expect(screen.getByTestId("vault-status-dock-handle")).toBeTruthy();
    expect(screen.queryByTestId("vault-status-dock")).toBeNull();
    expect(screen.queryByLabelText(/vault password/i)).toBeNull();
  });
});
