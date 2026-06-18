/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NotesVaultProtectedMessage } from "@/features/notes/notes-vault-protected-message";
import { VaultStatusDock } from "@/features/vault/vault-status-dock";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => "/notes"),
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
  useVaultClientStatus: vi.fn(() => ({
    status: "ready",
    clientStatus: "locked",
    setupPhase: "complete",
    serverStatus: {
      initialized: true,
      setupPhase: "complete",
      setupComplete: true,
      vaultVersion: "vault-v2",
      ltgSetupComplete: true,
      hasVaultPassword: true,
      availableUnlockMethods: { password: true, recoveryPhrase: true, passkey: false },
    },
    recheck: vi.fn(),
  })),
}));

vi.mock("@/features/vault/use-vault", () => ({
  useVault: vi.fn(() => ({
    loading: false,
    error: null,
    unlockFromVaultPassword: vi.fn(),
    unlockFromRecoveryPhrase: vi.fn(),
    unlockFromPasskey: vi.fn(),
    unlockFromRecoveryCode: vi.fn(),
    lockVault: vi.fn(),
  })),
}));

vi.mock("@/features/vault/use-vault-dock-passkey-available", () => ({
  useVaultDockPasskeyAvailable: vi.fn(() => ({
    hasEnvelope: false,
    showPasskey: false,
    prfExplicitlyUnsupported: false,
  })),
}));

vi.mock("@/lib/crypto-client/vault-session", () => ({
  lockVaultSession: vi.fn(),
  subscribeVaultSession: vi.fn(() => () => {}),
  subscribeVaultActivityTimer: vi.fn(() => () => {}),
  getVaultAutoLockRemainingMs: vi.fn(() => 900_000),
  registerVaultUnloadGuard: vi.fn(() => () => {}),
}));

describe("notes vault locked state actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Unlock here expands the Vault Status Dock", () => {
    render(
      <>
        <VaultStatusDock />
        <NotesVaultProtectedMessage />
      </>
    );

    expect(screen.getByTestId("vault-status-dock-handle")).toBeTruthy();
    expect(screen.queryByLabelText(/vault password/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /^unlock here$/i }));
    expect(screen.getByLabelText(/vault password/i)).toBeTruthy();
  });
});
