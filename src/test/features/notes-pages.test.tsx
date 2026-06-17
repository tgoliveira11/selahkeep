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
    vi.mocked(useRequireVault).mockReturnValue({
      status: "ready",
      userId: "user-1",
      vaultUnlocked: false,
      recheckVault: vi.fn(),
    });
  });

  it("renders notes list with vault locked message", async () => {
    render(<NotesPage />);
    expect(await screen.findByText("My notes")).toBeTruthy();
    expect(screen.getByText(/vault locked/i)).toBeTruthy();
  });
});
