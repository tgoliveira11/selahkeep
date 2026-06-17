/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import NotesPage from "@/app/(vault)/notes/page";
import VaultSettingsPage from "@/app/(vault)/vault/settings/page";
import VaultUnlockPage from "@/app/(vault)/vault/unlock/page";
import { SiteShell } from "@/components/layout/site-shell";
import HomePage from "@/app/(public)/page";

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

vi.mock("@/features/vault/use-require-vault", () => ({
  useRequireVault: vi.fn(),
}));

vi.mock("@/features/vault/use-vault-client-status", () => ({
  useVaultClientStatus: vi.fn(),
}));

vi.mock("@/features/vault/use-vault", () => ({
  useVault: vi.fn(() => ({
    loading: false,
    error: null,
    offlineNotice: null,
    initializeVault: vi.fn(),
    unlockFromDevice: vi.fn(),
    unlockFromPasskey: vi.fn(),
    unlockFromRecoveryCode: vi.fn(),
    unlockFromVaultPassword: vi.fn(),
    unlockFromRecoveryPhrase: vi.fn(),
  })),
}));

vi.mock("@/features/notes/use-vault-index", () => ({
  useVaultIndex: vi.fn(() => ({ index: null, loading: false, error: null })),
}));

vi.mock("@/features/notes/use-vault-settings", () => ({
  useVaultSettings: vi.fn(() => ({
    settings: null,
    loading: false,
    error: null,
    updateUnlockBehavior: vi.fn(),
  })),
}));

vi.mock("@/lib/crypto-client/vault-session", () => ({
  subscribeVaultSession: vi.fn(() => () => {}),
}));

function mockVaultReady(unlocked: boolean) {
  return {
    status: "ready" as const,
    userId: "user-1",
    vaultUnlocked: unlocked,
    recheckVault: vi.fn(),
  };
}

function mockClientStatus(
  clientStatus: "not_configured" | "setup_incomplete" | "locked" | "unlocked",
  serverOverrides: Record<string, unknown> = {}
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
      hasVault: clientStatus !== "not_configured",
      setupPhase,
      setupComplete: clientStatus === "locked" || clientStatus === "unlocked",
      vaultVersion: "vault-v2",
      ltgSetupComplete: clientStatus === "locked" || clientStatus === "unlocked",
      hasEncryptedSettings: clientStatus === "locked" || clientStatus === "unlocked",
      hasEncryptedIndex: clientStatus === "locked" || clientStatus === "unlocked",
      hasVaultPassword: clientStatus === "locked" || clientStatus === "unlocked",
      hasRecoveryPhrase: clientStatus === "locked" || clientStatus === "unlocked",
      ...serverOverrides,
    },
    recheck: vi.fn(),
  };
}

describe("vault status UI", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useRequireVault } = await import("@/features/vault/use-require-vault");
    vi.mocked(useRequireVault).mockReturnValue(mockVaultReady(false));
  });

  it("notes page shows LTG Vault welcome when vault is not configured", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("not_configured"));

    render(<NotesPage />);
    expect(await screen.findByText("Welcome to LTG Vault")).toBeTruthy();
    expect(screen.getByRole("link", { name: /set up your vault/i }).getAttribute("href")).toBe(
      "/vault/setup"
    );
    expect(screen.queryByText(/unlock to read this letter/i)).toBeNull();
    expect(screen.queryByText(/vault locked/i)).toBeNull();
    expect(screen.queryByRole("link", { name: /new note/i })).toBeNull();
  });

  it("notes page shows continue setup when setup is incomplete", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("setup_incomplete"));

    render(<NotesPage />);
    expect(await screen.findByText("Complete your vault setup")).toBeTruthy();
    expect(screen.getByRole("link", { name: /continue setup/i }).getAttribute("href")).toBe(
      "/vault/setup"
    );
  });

  it("notes page shows unlock prompt when vault is locked", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("locked"));

    render(<NotesPage />);
    expect(await screen.findByText("Unlock your vault to view your notes")).toBeTruthy();
    expect(screen.getByRole("link", { name: /unlock vault/i }).getAttribute("href")).toBe(
      "/vault/unlock"
    );
  });

  it("notes page shows notes when vault is unlocked", async () => {
    const { useRequireVault } = await import("@/features/vault/use-require-vault");
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    const { useVaultIndex } = await import("@/features/notes/use-vault-index");

    vi.mocked(useRequireVault).mockReturnValue(mockVaultReady(true));
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("unlocked"));
    vi.mocked(useVaultIndex).mockReturnValue({
      index: { entries: [], categories: [], tags: [] },
      loading: false,
      error: null,
      reload: vi.fn(),
      persistIndex: vi.fn(),
      mutateIndex: vi.fn(),
    });

    render(<NotesPage />);
    expect(await screen.findByRole("link", { name: /new note/i })).toBeTruthy();
    expect(screen.queryByText(/set up your vault/i)).toBeNull();
  });

  it("vault settings shows setup prompt when vault is not configured", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("not_configured"));

    render(<VaultSettingsPage />);
    expect(await screen.findByText("Set up your vault")).toBeTruthy();
    expect(screen.queryByText(/recovery protection/i)).toBeNull();
    expect(screen.queryByText(/unlock to read/i)).toBeNull();
  });

  it("vault settings shows unlock prompt when vault is locked", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("locked"));

    render(<VaultSettingsPage />);
    expect(await screen.findByText("Unlock your vault")).toBeTruthy();
    expect(screen.queryByText(/use recovery code/i)).toBeNull();
  });

  it("vault settings shows unlock behavior when vault is unlocked", async () => {
    const { useRequireVault } = await import("@/features/vault/use-require-vault");
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    const { useVaultSettings } = await import("@/features/notes/use-vault-settings");

    vi.mocked(useRequireVault).mockReturnValue(mockVaultReady(true));
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("unlocked"));
    vi.mocked(useVaultSettings).mockReturnValue({
      settings: { unlockBehavior: "metadata_only" },
      loading: false,
      error: null,
      updateUnlockBehavior: vi.fn(),
    });

    render(<VaultSettingsPage />);
    expect(await screen.findByText("Metadata only (recommended)")).toBeTruthy();
    expect(screen.queryByText(/set up your vault/i)).toBeNull();
  });

  it("vault unlock shows setup-first state when vault is not configured", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("not_configured"));

    render(<VaultUnlockPage />);
    expect(await screen.findByText("Set up your vault first")).toBeTruthy();
    expect(screen.getByRole("link", { name: /^set up vault$/i }).getAttribute("href")).toBe(
      "/vault/setup"
    );
    expect(screen.getByRole("link", { name: /go to notes/i }).getAttribute("href")).toBe("/notes");
    expect(screen.queryByLabelText(/vault password/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /^recovery phrase$/i })).toBeNull();
    expect(screen.queryByText(/unlock ltg vault/i)).toBeNull();
  });

  it("vault unlock shows continue setup when setup is incomplete", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("setup_incomplete"));

    render(<VaultUnlockPage />);
    expect(await screen.findByText("Complete your vault setup")).toBeTruthy();
    expect(screen.queryByLabelText(/vault password/i)).toBeNull();
  });

  it("vault unlock shows unlock methods when vault is locked", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("locked"));

    render(<VaultUnlockPage />);
    expect(await screen.findByText(/Unlock LTG Vault/i)).toBeTruthy();
    expect(screen.getByLabelText(/vault password/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /recovery phrase/i })).toBeTruthy();
  });

  it("vault unlock shows already unlocked state when vault is unlocked", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("unlocked"));

    render(<VaultUnlockPage />);
    expect(await screen.findByText("Your vault is already unlocked")).toBeTruthy();
    expect(screen.getByRole("link", { name: /go to notes/i }).getAttribute("href")).toBe("/notes");
  });
});

describe("nav vault status badge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows Set up vault when vault is not configured", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("not_configured"));

    render(
      <SiteShell>
        <HomePage />
      </SiteShell>
    );

    expect(screen.getByRole("link", { name: /set up vault/i }).getAttribute("href")).toBe(
      "/vault/setup"
    );
    expect(screen.getByText("Vault not set up")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /^unlock$/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /^unlock vault$/i })).toBeNull();
  });

  it("shows Continue setup when setup is incomplete", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("setup_incomplete"));

    render(
      <SiteShell>
        <HomePage />
      </SiteShell>
    );

    expect(screen.getByRole("link", { name: /continue setup/i }).getAttribute("href")).toBe(
      "/vault/setup"
    );
    expect(screen.getByText("Vault setup incomplete")).toBeTruthy();
  });

  it("shows Unlock vault when vault is locked and complete", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("locked"));

    render(
      <SiteShell>
        <HomePage />
      </SiteShell>
    );

    expect(screen.getByRole("link", { name: /unlock vault/i }).getAttribute("href")).toBe(
      "/vault/unlock"
    );
    expect(screen.getByText("Vault locked")).toBeTruthy();
  });

  it("shows Lock vault when vault is unlocked", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("unlocked"));

    render(
      <SiteShell>
        <HomePage />
      </SiteShell>
    );

    expect(screen.getByRole("button", { name: /lock vault/i })).toBeTruthy();
    expect(screen.getByText("Vault unlocked")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /unlock vault/i })).toBeNull();
  });

  it("does not render private letters copy in active vault UI", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("locked"));

    render(
      <SiteShell>
        <HomePage />
      </SiteShell>
    );

    expect(screen.queryByText(/private letters/i)).toBeNull();
    expect(screen.queryByText(/use recovery code/i)).toBeNull();
    expect(screen.queryByText(/unlock to read this letter/i)).toBeNull();
  });
});
