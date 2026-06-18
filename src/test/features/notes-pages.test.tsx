/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import NotesPage from "@/app/(vault)/notes/page";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => "/notes"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("@/features/vault/use-require-vault", () => ({
  useRequireVault: vi.fn(),
}));

vi.mock("@/features/vault/use-vault-client-status", () => ({
  useVaultClientStatus: vi.fn(),
}));

vi.mock("@/lib/api-client/vault", () => ({
  vaultApi: {
    getIndex: vi.fn().mockResolvedValue({ encryptedVaultIndex: null }),
  },
}));

vi.mock("@/lib/crypto-client/vault-session", () => ({
  subscribeVaultSession: vi.fn(() => () => {}),
}));

describe("notes pages", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useRequireVault } = await import("@/features/vault/use-require-vault");
    const { useVaultClientStatus } = await import("@/features/vault/use-vault-client-status");
    vi.mocked(useRequireVault).mockReturnValue({
      status: "ready",
      userId: "user-1",
      vaultUnlocked: false,
      recheckVault: vi.fn(),
    });
    vi.mocked(useVaultClientStatus).mockReturnValue({
      status: "ready",
      clientStatus: "locked",
      setupPhase: "complete",
      serverStatus: { initialized: true, setupPhase: "complete" },
      recheck: vi.fn(),
    });
  });

  it("renders notes list with vault locked message", async () => {
    render(<NotesPage />);
    expect(await screen.findByText("Notes")).toBeTruthy();
    expect(screen.getByText("Vault closed")).toBeTruthy();
  });
});
