import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { VaultLockedState } from "@/features/vault/vault-locked-state";
import { requestVaultDockExpand } from "@tgoliveira/vault-core/react";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => "/notes"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("@tgoliveira/vault-core/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tgoliveira/vault-core/react")>();
  return { ...actual, requestVaultDockExpand: vi.fn() };
});

describe("notes vault locked state actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Unlock here requests the dock to expand", () => {
    const expand = vi.mocked(requestVaultDockExpand);

    render(<VaultLockedState variant="notes-list" returnTo="/home" />);

    expect(screen.getByTestId("notes-vault-locked-state")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^unlock here$/i }));
    expect(expand).toHaveBeenCalledTimes(1);
  });
});
