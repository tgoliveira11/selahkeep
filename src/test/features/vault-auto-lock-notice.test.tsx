/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  VaultAutoLockNotice,
  VAULT_INACTIVITY_LOCK_MESSAGE,
} from "@/features/vault/vault-auto-lock-notice";
import {
  clearVaultAutoLockTimer,
  configureVaultAutoLock,
  lockVaultSession,
  unlockVaultSession,
  VAULT_INACTIVITY_MS,
} from "@/lib/crypto-client/vault-session";
import { generateUserVaultKey, setSessionVaultKey } from "@/lib/crypto-client/vault";

describe("VaultAutoLockNotice", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearVaultAutoLockTimer();
    setSessionVaultKey(null);
    configureVaultAutoLock();
  });

  afterEach(() => {
    lockVaultSession();
    configureVaultAutoLock();
    vi.useRealTimers();
  });

  it("is hidden until inactivity auto-lock fires", () => {
    render(<VaultAutoLockNotice />);

    expect(screen.queryByText(VAULT_INACTIVITY_LOCK_MESSAGE)).not.toBeInTheDocument();
  });

  it("shows after inactivity auto-lock and hides after unlock", async () => {
    render(<VaultAutoLockNotice />);

    await act(async () => {
      unlockVaultSession(await generateUserVaultKey());
    });
    act(() => {
      vi.advanceTimersByTime(VAULT_INACTIVITY_MS + 1);
    });

    expect(screen.getByText(VAULT_INACTIVITY_LOCK_MESSAGE)).toBeInTheDocument();

    await act(async () => {
      unlockVaultSession(await generateUserVaultKey());
    });

    expect(screen.queryByText(VAULT_INACTIVITY_LOCK_MESSAGE)).not.toBeInTheDocument();
  });

  it("does not show after manual lock", async () => {
    render(<VaultAutoLockNotice />);

    unlockVaultSession(await generateUserVaultKey());
    lockVaultSession();

    expect(screen.queryByText(VAULT_INACTIVITY_LOCK_MESSAGE)).not.toBeInTheDocument();
  });

  it("can be dismissed without unlocking", async () => {
    render(<VaultAutoLockNotice />);

    await act(async () => {
      unlockVaultSession(await generateUserVaultKey());
    });
    act(() => {
      vi.advanceTimersByTime(VAULT_INACTIVITY_MS + 1);
    });

    expect(screen.getByText(VAULT_INACTIVITY_LOCK_MESSAGE)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByText(VAULT_INACTIVITY_LOCK_MESSAGE)).not.toBeInTheDocument();
  });
});
