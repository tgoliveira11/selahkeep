import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useVaultAutoLockCountdown } from "@/features/vault/use-vault-auto-lock-countdown";

vi.mock("@/lib/crypto-client/vault-session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/crypto-client/vault-session")>();
  return {
    ...actual,
    subscribeVaultSession: vi.fn(() => () => {}),
    subscribeVaultActivityTimer: vi.fn(() => () => {}),
    getVaultAutoLockRemainingMs: vi.fn(() => 90_000),
    lockVaultSession: vi.fn(),
    lockVaultSessionManually: vi.fn(),
    registerVaultBeforeAutoLock: vi.fn(() => () => {}),
    isVaultManuallyLocked: vi.fn(() => false),
    wasVaultLockedByInactivity: vi.fn(() => false),
    registerVaultUnloadGuard: vi.fn(() => () => {}),
  };
});

function CountdownProbe({ active }: { active: boolean }) {
  const countdown = useVaultAutoLockCountdown(active);
  return <span data-testid="countdown">{countdown ?? "none"}</span>;
}

describe("useVaultAutoLockCountdown", () => {
  it("formats remaining time when active", () => {
    render(<CountdownProbe active />);
    expect(screen.getByTestId("countdown").textContent).toBe("1:30");
  });

  it("returns null display when inactive", () => {
    render(<CountdownProbe active={false} />);
    expect(screen.getByTestId("countdown").textContent).toBe("none");
  });
});
