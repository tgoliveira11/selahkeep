"use client";

import { useEffect, useState } from "react";
import {
  getVaultAutoLockRemainingMs,
  subscribeVaultActivityTimer,
  subscribeVaultSession,
} from "@/lib/crypto-client/vault-session";
import { formatAutoLockCountdown } from "@/lib/notes/auto-lock-countdown";

/** Live countdown until vault auto-lock after inactivity. */
export function useVaultAutoLockCountdown(active: boolean): string | null {
  const [tick, setTick] = useState(0);

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

  if (!active) return null;

  void tick;
  const remainingMs = getVaultAutoLockRemainingMs();
  if (remainingMs === null) return null;
  return formatAutoLockCountdown(remainingMs);
}
