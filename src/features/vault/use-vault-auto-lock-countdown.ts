"use client";

import { useEffect, useState } from "react";
import {
  getVaultAutoLockRemainingMs,
  subscribeVaultActivityTimer,
  subscribeVaultSession,
} from "@/lib/crypto-client/vault-session";
import { getVaultAutoLockTimeoutMs } from "@/lib/vault/vault-auto-lock-config";
import { formatAutoLockCountdown } from "@/lib/notes/auto-lock-countdown";

/** Subscribes to the activity/session ticks and re-renders once per second. */
function useAutoLockTick(active: boolean): void {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;

    function refresh() {
      setTick((value) => value + 1);
    }

    refresh();
    const unsubActivity = subscribeVaultActivityTimer(refresh);
    const unsubSession = subscribeVaultSession(refresh);
    const interval = window.setInterval(refresh, 1000);

    return () => {
      unsubActivity();
      unsubSession();
      window.clearInterval(interval);
    };
  }, [active]);
}

/** Live countdown until vault auto-lock after inactivity. */
export function useVaultAutoLockCountdown(active: boolean): string | null {
  useAutoLockTick(active);

  if (!active) return null;

  const remainingMs = getVaultAutoLockRemainingMs();
  if (remainingMs === null) return null;
  return formatAutoLockCountdown(remainingMs);
}

/**
 * Live fraction (0..1) of the auto-lock window still remaining. Drives the
 * circular countdown ring in the expanded vault dock. Returns null when the
 * vault is not unlocked / the countdown is unavailable.
 */
export function useVaultAutoLockFraction(active: boolean): number | null {
  useAutoLockTick(active);

  if (!active) return null;
  const remainingMs = getVaultAutoLockRemainingMs();
  if (remainingMs === null) return null;
  const totalMs = getVaultAutoLockTimeoutMs();
  if (!totalMs) return null;
  return Math.max(0, Math.min(1, remainingMs / totalMs));
}
