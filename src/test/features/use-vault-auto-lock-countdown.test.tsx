/** @vitest-environment happy-dom */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useVaultAutoLockCountdown } from "@/features/vault/use-vault-auto-lock-countdown";

vi.mock("@/lib/crypto-client/vault-session", () => ({
  getVaultAutoLockRemainingMs: vi.fn(() => 90_000),
  subscribeVaultActivityTimer: vi.fn(() => () => {}),
  subscribeVaultSession: vi.fn(() => () => {}),
}));

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
