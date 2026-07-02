import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import LoggedInHomePage from "@/app/(vault)/home/page";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace, back: vi.fn() })),
  usePathname: vi.fn(() => "/home"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("@/features/vault/use-require-vault", () => ({
  useRequireVault: vi.fn(),
}));

vi.mock("@/features/vault/use-vault-client-status", () => ({
  useVaultClientStatus: vi.fn(),
}));

function mockVaultReady(unlocked: boolean) {
  return {
    status: "ready" as const,
    userId: "user-1",
    vaultUnlocked: unlocked,
    recheckVault: vi.fn(),
  };
}

function mockClientStatus(clientStatus: "locked" | "unlocked" | "not_configured" | "setup_incomplete") {
  return {
    status: "ready" as const,
    clientStatus,
    setupPhase: clientStatus === "not_configured" ? ("not_configured" as const) : ("complete" as const),
    serverStatus: {
      initialized: clientStatus !== "not_configured",
      setupPhase: clientStatus === "not_configured" ? "not_configured" : "complete",
      setupComplete: clientStatus === "locked" || clientStatus === "unlocked",
      vaultVersion: "vault-v2" as const,
      ltgSetupComplete: true,
      hasVaultPassword: true,
      availableUnlockMethods: { password: true, recoveryPhrase: true, passkey: false },
    },
    recheck: vi.fn(),
  };
}

describe("logged-in home (/home)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useRequireVault } = await import("@/features/vault/use-require-vault");
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useRequireVault).mockReturnValue(mockVaultReady(false));
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("locked"));
  });

  it("shows locked hero and shared features section when vault is locked", async () => {
    render(<LoggedInHomePage />);
    expect(await screen.findByTestId("notes-vault-locked-state")).toBeTruthy();
    expect(screen.getByTestId("logged-in-home-features")).toBeTruthy();
    expect(screen.getByText(/organize with kanban boards/i)).toBeTruthy();
    expect(screen.getByText(/connect ai tools/i)).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows unlocked hero and the same features section when vault is unlocked", async () => {
    const { useRequireVault } = await import("@/features/vault/use-require-vault");
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useRequireVault).mockReturnValue(mockVaultReady(true));
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("unlocked"));

    render(<LoggedInHomePage />);
    expect(await screen.findByTestId("logged-in-home-unlocked")).toBeTruthy();
    expect(screen.getByTestId("logged-in-home-features")).toBeTruthy();
    expect(screen.getByText(/your privacy, in plain language/i)).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it("uses a fixed-height hero region for both states", async () => {
    render(<LoggedInHomePage />);
    expect(await screen.findByTestId("logged-in-home-hero")).toHaveClass("logged-in-home-hero");
  });
});
