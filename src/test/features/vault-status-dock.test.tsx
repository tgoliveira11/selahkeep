/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { SiteShell } from "@/components/layout/site-shell";
import HomePage from "@/app/(public)/page";
import { VaultStatusDock } from "@/features/vault/vault-status-dock";
import {
  getDefaultVaultStatusDockExpanded,
  getVaultStatusDockExpandedCopy,
  getVaultStatusDockHandleLabel,
  vaultStatusDockAutoCollapseWhenExpanded,
} from "@/features/vault/vault-status-dock-copy";
import {
  readVaultStatusDockCollapsedPreference,
  VAULT_STATUS_DOCK_COLLAPSED_KEY,
  writeVaultStatusDockCollapsedPreference,
} from "@/features/vault/vault-status-dock-preference";
import { lockVaultSessionManually } from "@/lib/crypto-client/vault-session";
import { sanitizeVaultReturnTo } from "@/lib/notes/safe-return-to";

const unlockFromVaultPassword = vi.fn();
const unlockFromRecoveryPhrase = vi.fn();
const unlockFromPasskey = vi.fn();

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

vi.mock("@/features/vault/use-vault", () => ({
  useVault: vi.fn(() => ({
    loading: false,
    error: null,
    unlockFromVaultPassword,
    unlockFromRecoveryPhrase,
    unlockFromPasskey,
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

vi.mock("@/features/vault/use-vault-activity", () => ({
  touchVaultActivity: vi.fn(),
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

function mockClientStatus(
  clientStatus: "not_configured" | "setup_incomplete" | "locked" | "unlocked"
) {
  const setupPhase =
    clientStatus === "not_configured"
      ? ("not_configured" as const)
      : clientStatus === "setup_incomplete"
        ? ("setup_incomplete" as const)
        : ("complete" as const);

  return {
    status: "ready" as const,
    clientStatus,
    setupPhase,
    serverStatus: {
      initialized: clientStatus !== "not_configured",
      setupPhase,
      setupComplete: clientStatus === "locked" || clientStatus === "unlocked",
      vaultVersion: "vault-v2" as const,
      ltgSetupComplete: true,
      hasVaultPassword: true,
      availableUnlockMethods: {
        password: true,
        recoveryPhrase: true,
        passkey: false,
      },
    },
    recheck: vi.fn(),
  };
}

const preferenceStore = new Map<string, string>();

function installLocalStorageStub() {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => preferenceStore.get(key) ?? null,
    setItem: (key: string, value: string) => {
      preferenceStore.set(key, value);
    },
    removeItem: (key: string) => {
      preferenceStore.delete(key);
    },
    clear: () => {
      preferenceStore.clear();
    },
  });
}

describe("vault status dock copy", () => {
  it("defaults collapsed for all visible dock states", () => {
    expect(getDefaultVaultStatusDockExpanded("not_configured")).toBe(false);
    expect(getDefaultVaultStatusDockExpanded("locked")).toBe(false);
    expect(vaultStatusDockAutoCollapseWhenExpanded("locked")).toBe(true);
    expect(vaultStatusDockAutoCollapseWhenExpanded("not_configured")).toBe(false);
  });

  it("formats compact handle labels and expanded copy", () => {
    expect(getVaultStatusDockHandleLabel("locked", null)).toBe("Vault");
    expect(getVaultStatusDockHandleLabel("unlocked", "14:32")).toBe("14:32");
    expect(getVaultStatusDockExpandedCopy("locked", null).title).toBe("Vault closed");
    expect(getVaultStatusDockExpandedCopy("unlocked", "14:32").countdownInline).toBe(
      "Auto-locks in 14:32"
    );
  });
});

describe("VaultStatusDock", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    preferenceStore.clear();
    installLocalStorageStub();
    unlockFromVaultPassword.mockResolvedValue(undefined);
    unlockFromRecoveryPhrase.mockResolvedValue(undefined);
    const { useSession } = await import("next-auth/react");
    const { usePathname } = await import("next/navigation");
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    const { useVault } = await import("@/features/vault/use-vault");
    const { useVaultDockPasskeyAvailable } = await import(
      "@/features/vault/use-vault-dock-passkey-available"
    );
    vi.mocked(usePathname).mockReturnValue("/notes");
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
      status: "authenticated",
      update: vi.fn(),
    });
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("locked"));
    vi.mocked(useVaultDockPasskeyAvailable).mockReturnValue({
      hasEnvelope: false,
      showPasskey: false,
      prfExplicitlyUnsupported: false,
    });
    vi.mocked(useVault).mockReturnValue({
      loading: false,
      error: null,
      unlockFromVaultPassword,
      unlockFromRecoveryPhrase,
      unlockFromPasskey,
      unlockFromRecoveryCode: vi.fn(),
      lockVault: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("collapsed locked handle is compact and hides unlock actions", async () => {
    render(<VaultStatusDock />);
    const handle = screen.getByTestId("vault-status-dock-handle");
    expect(handle.className).toContain("vault-status-dock-handle--closed");
    expect(within(handle).getByText("Vault closed")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /unlock vault/i })).toBeNull();
    expect(screen.queryByText(/unlock required/i)).toBeNull();
  });

  it("collapsed unlocked handle shows countdown only", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("unlocked"));

    render(<VaultStatusDock />);
    const handle = screen.getByTestId("vault-status-dock-handle");
    expect(handle.className).toContain("vault-status-dock-handle--open");
    expect(within(handle).getByText("14:32")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /lock now/i })).toBeNull();
  });

  it("expanded locked dock shows password unlock and more unlock options link", async () => {
    const { usePathname } = await import("next/navigation");
    vi.mocked(usePathname).mockReturnValue("/vault/settings");

    render(<VaultStatusDock />);
    fireEvent.click(screen.getByRole("button", { name: /expand vault status/i }));

    const dock = screen.getByTestId("vault-status-dock");
    expect(dock.className).toContain("vault-status-dock-panel--closed");
    expect(screen.getByText(/Vault closed/i)).toBeTruthy();
    expect(screen.getByLabelText(/vault password/i)).toBeTruthy();
    expect(screen.queryByRole("tab", { name: /recovery phrase/i })).toBeNull();
    expect(screen.queryByLabelText(/recovery phrase/i)).toBeNull();
    expect(screen.queryByRole("tab", { name: /^passkey$/i })).toBeNull();
    expect(screen.getByRole("link", { name: /more unlock options/i }).getAttribute("href")).toBe(
      "/vault/unlock?returnTo=%2Fvault%2Fsettings"
    );
    expect(dock.className).toContain("vault-status-dock-panel--narrow");
  });

  it("does not render dock on /vault/unlock", async () => {
    const { usePathname } = await import("next/navigation");
    vi.mocked(usePathname).mockReturnValue("/vault/unlock");

    render(<VaultStatusDock />);
    expect(screen.queryByTestId("vault-status-dock-handle")).toBeNull();
    expect(screen.queryByTestId("vault-status-dock")).toBeNull();
    expect(screen.queryByLabelText(/vault password/i)).toBeNull();
  });

  it("does not render dock before vault is configured", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("not_configured"));

    render(<VaultStatusDock />);
    expect(screen.queryByTestId("vault-status-dock-handle")).toBeNull();
    expect(screen.queryByText(/set up vault/i)).toBeNull();
  });

  it("collapses dock when More unlock options is clicked", async () => {
    render(<VaultStatusDock />);
    fireEvent.click(screen.getByRole("button", { name: /expand vault status/i }));
    fireEvent.click(screen.getByRole("link", { name: /more unlock options/i }));
    expect(screen.getByTestId("vault-status-dock-handle")).toBeTruthy();
    expect(localStorage.getItem(VAULT_STATUS_DOCK_COLLAPSED_KEY)).toBe("true");
  });

  it("uses reduced dock width styles", async () => {
    render(<VaultStatusDock />);
    fireEvent.click(screen.getByRole("button", { name: /expand vault status/i }));
    expect(document.querySelector(".vault-status-dock-panel")?.className).toContain(
      "vault-status-dock-panel--narrow"
    );
  });

  it("prioritizes passkey unlock when configured", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    const { useVaultDockPasskeyAvailable } = await import(
      "@/features/vault/use-vault-dock-passkey-available"
    );
    vi.mocked(useVaultClientStatus).mockReturnValue({
      ...mockClientStatus("locked"),
      serverStatus: {
        ...mockClientStatus("locked").serverStatus,
        availableUnlockMethods: {
          password: true,
          recoveryPhrase: true,
          passkey: true,
        },
      },
    });
    vi.mocked(useVaultDockPasskeyAvailable).mockReturnValue({
      hasEnvelope: true,
      showPasskey: true,
      prfExplicitlyUnsupported: false,
    });

    render(<VaultStatusDock />);
    fireEvent.click(screen.getByRole("button", { name: /expand vault status/i }));
    expect(screen.getByRole("button", { name: /unlock with passkey/i })).toBeTruthy();
    expect(screen.queryByLabelText(/vault password/i)).toBeNull();
  });

  it("expanded open dock shows the countdown ring, stay-unlocked and lock now", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("unlocked"));

    render(<VaultStatusDock />);
    fireEvent.click(screen.getByRole("button", { name: /expand vault status/i }));

    const dock = screen.getByTestId("vault-status-dock");
    expect(dock.className).toContain("vault-status-dock-panel--unlocked");
    expect(screen.getByText(/Vault open/i)).toBeTruthy();
    expect(screen.getByText(/Auto-locks in/i)).toBeTruthy();
    expect(screen.getByText("14:32")).toBeTruthy();
    expect(
      screen.queryByText(/SelahKeep will lock your vault after inactivity/i)
    ).toBeNull();
    expect(screen.getByRole("button", { name: /stay unlocked 15 min/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /lock now/i })).toBeTruthy();
  });

  it("stay-unlocked resets the inactivity timer", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("unlocked"));
    const { touchVaultActivity } = await import("@/features/vault/use-vault-activity");

    render(<VaultStatusDock />);
    fireEvent.click(screen.getByRole("button", { name: /expand vault status/i }));
    fireEvent.click(screen.getByRole("button", { name: /stay unlocked 15 min/i }));

    expect(vi.mocked(touchVaultActivity)).toHaveBeenCalled();
  });

  it("collapses on outside click when expanded locked", async () => {
    render(<VaultStatusDock />);
    fireEvent.click(screen.getByRole("button", { name: /expand vault status/i }));
    expect(screen.getByTestId("vault-status-dock")).toBeTruthy();

    fireEvent.mouseDown(document.body);
    expect(screen.getByTestId("vault-status-dock-handle")).toBeTruthy();
  });

  it("collapses on Escape when expanded", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("unlocked"));

    render(<VaultStatusDock />);
    fireEvent.click(screen.getByRole("button", { name: /expand vault status/i }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByTestId("vault-status-dock-handle")).toBeTruthy();
  });

  it("does not collapse while unlock is loading", async () => {
    const { useVault } = await import("@/features/vault/use-vault");
    vi.mocked(useVault).mockReturnValue({
      loading: true,
      error: null,
      unlockFromVaultPassword,
      unlockFromRecoveryPhrase,
      unlockFromPasskey,
      unlockFromRecoveryCode: vi.fn(),
      lockVault: vi.fn(),
    });

    render(<VaultStatusDock />);
    fireEvent.click(screen.getByRole("button", { name: /expand vault status/i }));
    fireEvent.mouseDown(document.body);
    expect(screen.getByTestId("vault-status-dock")).toBeTruthy();
  });

  it("submits inline password unlock without navigation", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    const recheck = vi.fn();
    vi.mocked(useVaultClientStatus).mockReturnValue({
      ...mockClientStatus("locked"),
      recheck,
    });

    render(<VaultStatusDock />);
    fireEvent.click(screen.getByRole("button", { name: /expand vault status/i }));
    fireEvent.change(screen.getByLabelText(/vault password/i), {
      target: { value: "vault-secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^unlock vault$/i }));

    expect(unlockFromVaultPassword).toHaveBeenCalledWith("vault-secret");
    await vi.waitFor(() => expect(recheck).toHaveBeenCalledTimes(1));
    const { useRouter } = await import("next/navigation");
    expect(vi.mocked(useRouter)().push).not.toHaveBeenCalled();
  });

  it("lock now locks vault and collapses", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("unlocked"));

    render(<VaultStatusDock />);
    fireEvent.click(screen.getByRole("button", { name: /expand vault status/i }));
    fireEvent.click(screen.getByRole("button", { name: /lock now/i }));

    expect(lockVaultSessionManually).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("vault-status-dock-handle")).toBeTruthy();
  });

  it("rejects unsafe returnTo values", () => {
    expect(sanitizeVaultReturnTo("https://evil.com")).toBeNull();
    expect(sanitizeVaultReturnTo("javascript:alert(1)")).toBeNull();
  });

  it("renders handle inside authenticated header when vault is configured", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("locked"));

    render(
      <SiteShell>
        <HomePage />
      </SiteShell>
    );
    const header = screen.getByRole("banner");
    expect(within(header).getByTestId("vault-status-dock-handle")).toBeTruthy();
    expect(within(header).queryByRole("link", { name: /unlock vault/i })).toBeNull();
  });

  it("stores only UI collapse preference", () => {
    writeVaultStatusDockCollapsedPreference(true);
    expect(localStorage.getItem(VAULT_STATUS_DOCK_COLLAPSED_KEY)).toBe("true");
    expect(readVaultStatusDockCollapsedPreference()).toBe(true);
  });
});
