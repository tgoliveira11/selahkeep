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
import { lockVaultSession } from "@/lib/crypto-client/vault-session";
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

vi.mock("@/lib/crypto-client/vault-session", () => ({
  lockVaultSession: vi.fn(),
  subscribeVaultSession: vi.fn(() => () => {}),
  subscribeVaultActivityTimer: vi.fn(() => () => {}),
  getVaultAutoLockRemainingMs: vi.fn(() => 14 * 60 * 1000 + 32 * 1000),
  registerVaultUnloadGuard: vi.fn(() => () => {}),
}));

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
  it("defaults expanded for setup states only", () => {
    expect(getDefaultVaultStatusDockExpanded("not_configured")).toBe(true);
    expect(vaultStatusDockAutoCollapseWhenExpanded("locked")).toBe(true);
    expect(vaultStatusDockAutoCollapseWhenExpanded("not_configured")).toBe(false);
  });

  it("formats compact handle labels and expanded copy", () => {
    expect(getVaultStatusDockHandleLabel("locked", null)).toBe("Vault");
    expect(getVaultStatusDockHandleLabel("unlocked", "14:32")).toBe("14:32");
    expect(getVaultStatusDockExpandedCopy("locked", null).body).toMatch(/Unlock required/);
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
    vi.mocked(usePathname).mockReturnValue("/notes");
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
      status: "authenticated",
      update: vi.fn(),
    });
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("locked"));
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
    expect(within(handle).getByText("Vault")).toBeTruthy();
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

  it("expanded locked dock shows inline password form and fallback link", async () => {
    const { usePathname } = await import("next/navigation");
    vi.mocked(usePathname).mockReturnValue("/vault/settings");

    render(<VaultStatusDock />);
    fireEvent.click(screen.getByRole("button", { name: /expand vault status/i }));

    const dock = screen.getByTestId("vault-status-dock");
    expect(dock.className).toContain("vault-status-dock-panel--closed");
    expect(screen.getByText(/Unlock required to access private notes/i)).toBeTruthy();
    expect(screen.getByLabelText(/vault password/i)).toBeTruthy();
    expect(screen.queryByRole("tab", { name: /recovery phrase/i })).toBeNull();
    expect(screen.queryByLabelText(/recovery phrase/i)).toBeNull();
    expect(screen.getByRole("link", { name: /open full unlock page/i }).getAttribute("href")).toBe(
      "/vault/unlock?returnTo=%2Fvault%2Fsettings"
    );
    expect(dock.className).toContain("vault-status-dock-panel--narrow");
    expect(screen.queryByRole("link", { name: /^unlock vault$/i })).toBeNull();
  });

  it("on /vault/unlock keeps dock collapsed when locked", async () => {
    const { usePathname } = await import("next/navigation");
    vi.mocked(usePathname).mockReturnValue("/vault/unlock");

    render(<VaultStatusDock />);
    expect(screen.getByTestId("vault-status-dock-handle")).toBeTruthy();
    expect(screen.queryByTestId("vault-status-dock")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /expand vault status/i }));
    expect(screen.getByTestId("vault-status-dock-handle")).toBeTruthy();
    expect(screen.queryByLabelText(/vault password/i)).toBeNull();
  });

  it("collapses dock when Open full unlock page is clicked", async () => {
    render(<VaultStatusDock />);
    fireEvent.click(screen.getByRole("button", { name: /expand vault status/i }));
    fireEvent.click(screen.getByRole("link", { name: /open full unlock page/i }));
    expect(screen.getByTestId("vault-status-dock-handle")).toBeTruthy();
    expect(localStorage.getItem(VAULT_STATUS_DOCK_COLLAPSED_KEY)).toBe("true");
  });

  it("expanded locked dock uses narrow layout class", async () => {
    render(<VaultStatusDock />);
    fireEvent.click(screen.getByRole("button", { name: /expand vault status/i }));
    expect(screen.getByTestId("vault-status-dock").className).toContain(
      "vault-status-dock-panel--narrow"
    );
  });

  it("expanded open dock is compact with lock now on one row", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("unlocked"));

    render(<VaultStatusDock />);
    fireEvent.click(screen.getByRole("button", { name: /expand vault status/i }));

    const dock = screen.getByTestId("vault-status-dock");
    expect(dock.className).toContain("vault-status-dock-panel--compact");
    expect(screen.getByText(/Vault open · Auto-locks in 14:32/i)).toBeTruthy();
    expect(
      screen.queryByText(/SelahKeep will lock your vault after inactivity/i)
    ).toBeNull();
    expect(screen.getByRole("button", { name: /lock now/i })).toBeTruthy();
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
    render(<VaultStatusDock />);
    fireEvent.click(screen.getByRole("button", { name: /expand vault status/i }));
    fireEvent.change(screen.getByLabelText(/vault password/i), {
      target: { value: "vault-secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^unlock vault$/i }));

    expect(unlockFromVaultPassword).toHaveBeenCalledWith("vault-secret");
    const { useRouter } = await import("next/navigation");
    expect(vi.mocked(useRouter)().push).not.toHaveBeenCalled();
  });

  it("lock now locks vault and collapses", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("unlocked"));

    render(<VaultStatusDock />);
    fireEvent.click(screen.getByRole("button", { name: /expand vault status/i }));
    fireEvent.click(screen.getByRole("button", { name: /lock now/i }));

    expect(lockVaultSession).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("vault-status-dock-handle")).toBeTruthy();
  });

  it("rejects unsafe returnTo values", () => {
    expect(sanitizeVaultReturnTo("https://evil.com")).toBeNull();
    expect(sanitizeVaultReturnTo("javascript:alert(1)")).toBeNull();
  });

  it("renders handle inside authenticated header", async () => {
    render(
      <SiteShell>
        <HomePage />
      </SiteShell>
    );
    const header = screen.getByRole("banner");
    expect(within(header).getByTestId("vault-status-dock-handle")).toBeTruthy();
    const mainNav = within(header).getByRole("navigation", { name: /main navigation/i });
    expect(within(mainNav).queryByRole("link", { name: /unlock vault/i })).toBeNull();
  });

  it("stores only UI collapse preference", () => {
    writeVaultStatusDockCollapsedPreference(true);
    expect(localStorage.getItem(VAULT_STATUS_DOCK_COLLAPSED_KEY)).toBe("true");
    expect(readVaultStatusDockCollapsedPreference()).toBe(true);
  });
});
