/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
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
    unlockFromPasskey: vi.fn(),
    unlockFromRecoveryCode: vi.fn(),
    unlockFromVaultPassword: vi.fn(),
    unlockFromRecoveryPhrase: vi.fn(),
  })),
}));

vi.mock("@/features/notes/use-vault-index", () => ({
  useVaultIndex: vi.fn(() => ({
    index: null,
    loading: false,
    error: null,
    reload: vi.fn(),
    persistIndex: vi.fn(),
    mutateIndex: vi.fn(),
  })),
}));

vi.mock("@/features/notes/use-notes", () => ({
  useNotes: vi.fn(() => ({
    toggleNoteResolved: vi.fn(),
    moveNoteToTrash: vi.fn(),
    restoreNoteFromTrash: vi.fn(),
    permanentlyDeleteNote: vi.fn(),
    toggleNotePinned: vi.fn(),
    toggleNoteFavorite: vi.fn(),
    toggleNoteArchived: vi.fn(),
    duplicateNote: vi.fn(),
    busy: false,
    error: null,
  })),
}));

vi.mock("@/lib/crypto-client/note-drafts", () => ({
  listEncryptedNoteDraftKeys: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/passkey/passkey-vault-unlock-setup", () => ({
  PasskeyVaultUnlockSetup: () => <div data-testid="passkey-vault-unlock-setup" />,
}));

vi.mock("@/features/notes/use-vault-settings", () => ({
  useVaultSettings: vi.fn(() => ({
    settings: null,
    loading: false,
    error: null,
    updateUnlockBehavior: vi.fn(),
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

  it("notes page shows SelahKeep welcome when vault is not configured", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("not_configured"));

    render(<NotesPage />);
    expect(await screen.findByText("Welcome to SelahKeep")).toBeTruthy();
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
    expect(await screen.findByText("Notes")).toBeTruthy();
    expect(screen.queryByTestId("notes-vault-indicator")).toBeNull();
  });

  it("notes page shows protected message when vault is locked", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("locked"));

    render(<NotesPage />);
    expect(await screen.findByTestId("notes-vault-protected-message")).toBeTruthy();
    expect(screen.queryByTestId("notes-vault-indicator")).toBeNull();
    expect(screen.queryByRole("link", { name: /unlock vault/i })).toBeNull();
  });

  it("notes page shows notes when vault is unlocked", async () => {
    const { useRequireVault } = await import("@/features/vault/use-require-vault");
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    const { useVaultIndex } = await import("@/features/notes/use-vault-index");

    vi.mocked(useRequireVault).mockReturnValue(mockVaultReady(true));
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("unlocked"));
    vi.mocked(useVaultIndex).mockReturnValue({
      index: { version: 3, entries: [], categories: [], tags: [], savedViews: [] },
      loading: false,
      error: null,
      reload: vi.fn(),
      persistIndex: vi.fn(),
      mutateIndex: vi.fn(),
    });

    render(<NotesPage />);
    expect((await screen.findAllByTestId("new-note-action")).length).toBeGreaterThan(0);
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

  it("vault settings locked prompt links to full unlock page with returnTo", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("locked"));

    render(<VaultSettingsPage />);
    expect(
      screen.getByRole("link", { name: /open full unlock page/i }).getAttribute("href")
    ).toBe("/vault/unlock?returnTo=%2Fvault%2Fsettings");
  });

  it("vault settings shows unlock prompt when vault is locked", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("locked"));

    render(<VaultSettingsPage />);
    expect(
      await screen.findByText(/unlock your vault to manage vault settings/i)
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /unlock here/i })).toBeTruthy();
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
    expect(screen.getByTestId("passkey-vault-unlock-setup")).toBeTruthy();
    expect(screen.queryByText(/set up your vault/i)).toBeNull();
  });

  it("vault unlock already unlocked uses sanitized returnTo link", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    const { useSearchParams } = await import("next/navigation");
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("returnTo=%2Fvault%2Fsettings") as ReturnType<typeof useSearchParams>
    );
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("unlocked"));

    render(<VaultUnlockPage />);
    expect(screen.getByRole("link", { name: /go to notes/i }).getAttribute("href")).toBe(
      "/vault/settings"
    );
  });

  it("vault unlock rejects unsafe returnTo and defaults to notes", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    const { useSearchParams } = await import("next/navigation");
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("returnTo=https%3A%2F%2Fevil.test") as ReturnType<typeof useSearchParams>
    );
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("unlocked"));

    render(<VaultUnlockPage />);
    expect(screen.getByRole("link", { name: /go to notes/i }).getAttribute("href")).toBe("/notes");
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
    expect(screen.queryByText(/unlock selahkeep/i)).toBeNull();
  });

  it("vault unlock shows continue setup when setup is incomplete", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("setup_incomplete"));

    render(<VaultUnlockPage />);
    expect(await screen.findByText("Complete your vault setup")).toBeTruthy();
    expect(screen.queryByLabelText(/vault password/i)).toBeNull();
  });

  it("vault unlock hides passkey when no passkey envelope exists", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(
      mockClientStatus("locked", {
        availableUnlockMethods: { password: true, recoveryPhrase: true, passkey: false },
        hasPasskey: false,
      })
    );

    render(<VaultUnlockPage />);
    expect(await screen.findByText(/Unlock SelahKeep/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /unlock with passkey/i })).toBeNull();
  });

  it("vault unlock shows passkey when passkey envelope exists", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(
      mockClientStatus("locked", {
        availableUnlockMethods: { password: true, recoveryPhrase: true, passkey: true },
        hasPasskey: true,
      })
    );

    render(<VaultUnlockPage />);
    expect(await screen.findByRole("button", { name: /unlock with passkey/i })).toBeTruthy();
  });

  it("vault unlock still shows recovery phrase when vault is locked", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("locked"));

    render(<VaultUnlockPage />);
    expect(await screen.findByRole("tab", { name: /^recovery phrase$/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /^vault password$/i })).toBeTruthy();
  });

  it("vault unlock shows already unlocked state when vault is unlocked", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("unlocked"));

    render(<VaultUnlockPage />);
    expect(await screen.findByText("Your vault is already unlocked")).toBeTruthy();
    expect(screen.getByRole("link", { name: /go to notes/i }).getAttribute("href")).toBe("/notes");
  });
});

describe("nav vault status dock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows vault status bar below header when vault is not configured", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("not_configured"));

    render(
      <SiteShell>
        <HomePage />
      </SiteShell>
    );

    const header = screen.getByRole("banner");
    const dock = screen.getByTestId("vault-status-dock");
    const mainNav = within(header).getByRole("navigation", { name: /main navigation/i });
    expect(within(mainNav).queryByRole("link", { name: /set up vault/i })).toBeNull();
    expect(within(dock).getByText("Vault not set up")).toBeTruthy();
    expect(within(dock).getByRole("link", { name: /set up vault/i }).getAttribute("href")).toBe(
      "/vault/setup"
    );
  });

  it("shows continue setup in status bar when setup is incomplete", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("setup_incomplete"));

    render(
      <SiteShell>
        <HomePage />
      </SiteShell>
    );

    const dock = screen.getByTestId("vault-status-dock");
    const mainNav = within(screen.getByRole("banner")).getByRole("navigation", {
      name: /main navigation/i,
    });
    expect(within(dock).getByText("Setup incomplete")).toBeTruthy();
    expect(within(dock).getByRole("link", { name: /continue setup/i })).toBeTruthy();
    expect(within(mainNav).queryByText("Setup incomplete")).toBeNull();
  });

  it("shows unlock vault in status bar when vault is locked", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("locked"));

    render(
      <SiteShell>
        <HomePage />
      </SiteShell>
    );

    const handle = within(screen.getByRole("banner")).getByTestId("vault-status-dock-handle");
    expect(within(handle).getByText("Vault")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /unlock vault/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /expand vault status/i }));
    const dock = screen.getByTestId("vault-status-dock");
    expect(within(dock).getByText(/Vault closed/)).toBeTruthy();
    expect(within(dock).getByLabelText(/vault password/i)).toBeTruthy();
    expect(within(dock).queryByRole("tab", { name: /recovery phrase/i })).toBeNull();
    const mainNav = within(screen.getByRole("banner")).getByRole("navigation", {
      name: /main navigation/i,
    });
    expect(within(mainNav).queryByRole("link", { name: /unlock vault/i })).toBeNull();
  });

  it("shows lock now in status bar when vault is unlocked", async () => {
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("unlocked"));

    render(
      <SiteShell>
        <HomePage />
      </SiteShell>
    );

    const handle = within(screen.getByRole("banner")).getByTestId("vault-status-dock-handle");
    expect(within(handle).getByText(/14:32/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /lock now/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /expand vault status/i }));
    const dock = screen.getByTestId("vault-status-dock");
    expect(within(dock).getByText(/Vault open · Auto-locks in 14:32/i)).toBeTruthy();
    expect(within(dock).getByRole("button", { name: /lock now/i })).toBeTruthy();
    expect(within(screen.getByRole("banner")).queryByRole("button", { name: /lock vault/i })).toBeNull();
  });

  it("does not render private letters copy in vault status bar", async () => {
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
