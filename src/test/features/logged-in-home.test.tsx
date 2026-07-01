/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

vi.mock("@/lib/auth/post-login-home", () => ({
  consumePostLoginHomePending: vi.fn(() => true),
  markPostLoginHomePending: vi.fn(),
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

  it("shows the vault locked hero and reassurance when vault is locked", async () => {
    render(<LoggedInHomePage />);
    expect(await screen.findByTestId("notes-vault-locked-state")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /your vault is locked/i })).toBeTruthy();
    expect(screen.getByText(/encrypted and waiting/i)).toBeTruthy();
    expect(screen.getByTestId("vault-open-full-unlock-page").getAttribute("href")).toBe(
      "/vault/unlock?next=%2Fhome"
    );
  });

  it("redirects unlocked users to /notes", async () => {
    const { useRequireVault } = await import("@/features/vault/use-require-vault");
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useRequireVault).mockReturnValue(mockVaultReady(true));
    vi.mocked(useVaultClientStatus).mockReturnValue(mockClientStatus("unlocked"));

    render(<LoggedInHomePage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/notes"));
  });

  it("redirects to /notes when visit is not immediately after login", async () => {
    const { consumePostLoginHomePending } = await import("@/lib/auth/post-login-home");
    vi.mocked(consumePostLoginHomePending).mockReturnValue(false);

    render(<LoggedInHomePage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/notes"));
    expect(screen.queryByTestId("notes-vault-locked-state")).toBeNull();
  });
});
