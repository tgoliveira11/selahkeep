/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import {
  touchVaultActivity,
  useVaultActivity,
} from "@/features/vault/use-vault-activity";
import * as vaultSession from "@/lib/crypto-client/vault-session";import { generateUserVaultKey } from "@/lib/crypto-client/vault";

function ActivityProbe() {
  useVaultActivity();
  return <div data-testid="probe" />;
}

describe("useVaultActivity", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vaultSession.clearVaultAutoLockTimer();
    lockVaultSession();
    vi.spyOn(vaultSession, "touchVaultSession");
  });

  afterEach(() => {
    vaultSession.lockVaultSession();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("resets inactivity timer on window activity events", async () => {
    const key = await generateUserVaultKey();
    vaultSession.unlockVaultSession(key);

    render(<ActivityProbe />);

    const windowEvents = ["click", "focusin", "scroll", "touchstart"] as const;
    for (const type of windowEvents) {
      vi.advanceTimersByTime(60_000);
      window.dispatchEvent(new Event(type, { bubbles: true }));
    }

    expect(vaultSession.touchVaultSession).toHaveBeenCalled();
    expect(vaultSession.touchVaultSession.mock.calls.length).toBeGreaterThanOrEqual(
      windowEvents.length
    );
  });

  it("resets inactivity timer on document capture events", async () => {
    const key = await generateUserVaultKey();
    vaultSession.unlockVaultSession(key);

    render(<ActivityProbe />);

    const captureEvents = [
      "keydown",
      "input",
      "pointerdown",
      "compositionstart",
      "compositionend",
      "paste",
    ] as const;

    for (const type of captureEvents) {
      vi.advanceTimersByTime(60_000);
      document.dispatchEvent(new Event(type, { bubbles: true }));
    }

    expect(vaultSession.touchVaultSession.mock.calls.length).toBeGreaterThanOrEqual(
      captureEvents.length
    );
  });

  it("touchVaultActivity calls touchVaultSession", () => {
    touchVaultActivity();
    expect(vaultSession.touchVaultSession).toHaveBeenCalledTimes(1);
  });
});
