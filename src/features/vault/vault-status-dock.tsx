"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { lockVaultSessionManually } from "@/lib/crypto-client/vault-session";
import { recordVaultSecurityEvent } from "@/features/vault/record-vault-security-event";
import { buildVaultUnlockHref } from "@/lib/notes/safe-return-to";
import type { VaultClientStatus } from "@/lib/vault/vault-status";
import {
  useVaultAutoLockCountdown,
  useVaultAutoLockFraction,
} from "@/features/vault/use-vault-auto-lock-countdown";
import { suppressVaultActivity, touchVaultActivity } from "@/features/vault/use-vault-activity";
import { useVaultClientStatus } from "@/features/vault/use-vault-client-status";
import { useVault } from "@/features/vault/use-vault";
import { VaultDockQuickUnlock } from "@/features/vault/vault-dock-quick-unlock";
import { useVaultDockPasskeyAvailable } from "@/features/vault/use-vault-dock-passkey-available";
import {
  getDefaultVaultStatusDockExpanded,
  getVaultStatusDockExpandedCopy,
  getVaultStatusDockHandleLabel,
  vaultStatusDockAutoCollapseWhenExpanded,
} from "@/features/vault/vault-status-dock-copy";
import { isVaultFullUnlockPage } from "@/features/vault/vault-status-dock-routes";
import {
  VaultStatusDockChevron,
  VaultStatusIcon,
} from "@/features/vault/vault-status-dock-icons";
import {
  readVaultStatusDockCollapsedPreference,
  writeVaultStatusDockCollapsedPreference,
} from "@/features/vault/vault-status-dock-preference";
import { useVaultDockDismiss } from "@/features/vault/use-vault-dock-dismiss";
import { subscribeVaultDockExpand } from "@/features/vault/vault-status-dock-events";
import { cn } from "@/lib/ui/cn";

function iconToneClass(clientStatus: VaultClientStatus): string {
  switch (clientStatus) {
    case "unlocked":
      return "vault-status-dock__icon--open";
    case "setup_incomplete":
      return "vault-status-dock__icon--warning";
    case "not_configured":
      return "vault-status-dock__icon--muted";
    case "locked":
      return "vault-status-dock__icon--closed";
  }
}

function handleToneClass(clientStatus: VaultClientStatus): string {
  switch (clientStatus) {
    case "unlocked":
      return "vault-status-dock-handle--open";
    case "locked":
      return "vault-status-dock-handle--closed";
    case "setup_incomplete":
      return "vault-status-dock-handle--warning";
    case "not_configured":
      return "vault-status-dock-handle--muted";
  }
}

function resolveExpanded(
  clientStatus: VaultClientStatus,
  preference: boolean | null,
  onFullUnlockPage: boolean
): boolean {
  if (onFullUnlockPage && clientStatus === "locked") {
    return false;
  }
  if (getDefaultVaultStatusDockExpanded(clientStatus)) {
    return true;
  }
  if (preference !== null) {
    return !preference;
  }
  return false;
}

function buildCurrentReturnPath(pathname: string, searchParams: URLSearchParams): string {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** Header-attached collapsible vault status handle and expanded dock. */
export function VaultStatusDock() {
  const { status: authStatus } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onFullUnlockPage = isVaultFullUnlockPage(pathname);
  const vaultClient = useVaultClientStatus();
  const vault = useVault();
  const clientStatus = vaultClient.status === "ready" ? vaultClient.clientStatus : null;
  const serverStatus = vaultClient.status === "ready" ? vaultClient.serverStatus : null;
  const passkeyAvailability = useVaultDockPasskeyAvailable(serverStatus);
  const isOpen = clientStatus === "unlocked";
  const countdown = useVaultAutoLockCountdown(isOpen);
  const lockFraction = useVaultAutoLockFraction(isOpen);
  const panelRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const [expansion, setExpansion] = useState<{
    status: VaultClientStatus;
    expanded: boolean;
  } | null>(null);

  const currentReturnPath = useMemo(
    () => buildCurrentReturnPath(pathname, searchParams),
    [pathname, searchParams]
  );

  const expanded = useMemo(() => {
    if (!clientStatus) return false;
    if (onFullUnlockPage && clientStatus === "locked") {
      return false;
    }
    if (expansion?.status === clientStatus) return expansion.expanded;
    const preference = readVaultStatusDockCollapsedPreference();
    return resolveExpanded(clientStatus, preference, onFullUnlockPage);
  }, [clientStatus, expansion, onFullUnlockPage]);

  const collapse = useCallback(() => {
    if (!clientStatus) return;
    suppressVaultActivity();
    setExpansion({ status: clientStatus, expanded: false });
    writeVaultStatusDockCollapsedPreference(true);
    handleRef.current?.focus();
  }, [clientStatus]);

  const expand = useCallback(() => {
    if (!clientStatus) return;
    if (onFullUnlockPage && clientStatus === "locked") return;
    suppressVaultActivity();
    setExpansion({ status: clientStatus, expanded: true });
    writeVaultStatusDockCollapsedPreference(false);
  }, [clientStatus, onFullUnlockPage]);

  useEffect(() => subscribeVaultDockExpand(expand), [expand]);

  useEffect(() => {
    if (!expanded || !panelRef.current || clientStatus !== "locked" || onFullUnlockPage) return;
    // Focus the password field (not the collapse chevron, which comes first in DOM).
    const input =
      panelRef.current.querySelector<HTMLElement>("input") ??
      panelRef.current.querySelector<HTMLElement>("button");
    input?.focus();
  }, [expanded, clientStatus, onFullUnlockPage]);

  const prevClientStatusRef = useRef<VaultClientStatus | null>(null);

  useEffect(() => {
    const previous = prevClientStatusRef.current;
    prevClientStatusRef.current = clientStatus;
    if (previous === "locked" && clientStatus === "unlocked" && expanded) {
      collapse();
    }
  }, [clientStatus, collapse, expanded]);

  const autoCollapseEnabled =
    expanded &&
    clientStatus !== null &&
    vaultStatusDockAutoCollapseWhenExpanded(clientStatus);

  useVaultDockDismiss({
    panelRef,
    handleRef,
    enabled: autoCollapseEnabled,
    shouldPreventDismiss: () => vault.loading,
    onDismiss: collapse,
  });

  if (authStatus !== "authenticated") return null;
  if (vaultClient.status !== "ready" || !clientStatus) return null;
  if (clientStatus === "not_configured" || clientStatus === "setup_incomplete") return null;
  if (onFullUnlockPage) return null;

  const status = clientStatus;
  const expandedCopy = getVaultStatusDockExpandedCopy(status, countdown);
  const showLtgUnlock = serverStatus?.setupComplete && serverStatus.vaultVersion === "vault-v2";
  const unlockHref = buildVaultUnlockHref(currentReturnPath);
  const handleLabel = getVaultStatusDockHandleLabel(status, countdown);
  const fullUnlockLinkLabel =
    passkeyAvailability.hasEnvelope && !passkeyAvailability.showPasskey
      ? "Open full unlock page"
      : "More unlock options";

  function lockNow() {
    lockVaultSessionManually();
    void recordVaultSecurityEvent("vault_locked_manual");
    collapse();
  }

  /** Resets the inactivity timer so the vault stays open for another window. */
  function stayUnlocked() {
    touchVaultActivity();
  }

  function openFullUnlockPage() {
    collapse();
  }

  if (!expanded) {
    return (
      <button
        ref={handleRef}
        type="button"
        className={cn("vault-status-dock-handle", handleToneClass(status))}
        data-vault-dock-ignore-activity
        data-testid="vault-status-dock-handle"
        data-vault-state={isOpen ? "open" : "closed"}
        aria-expanded={false}
        aria-label="Expand vault status"
        onClick={expand}
      >
        <span className={cn("vault-status-dock-handle__icon", iconToneClass(status))}>
          <VaultStatusIcon status={status} />
        </span>
        <span className="vault-status-dock-handle__label">
          {isOpen ? "Vault open" : "Vault closed"}
        </span>
        {isOpen && countdown && (
          <span className="vault-status-dock-handle__time">{countdown}</span>
        )}
      </button>
    );
  }

  if (status === "unlocked") {
    // Circular countdown ring (r=16 → circumference ≈ 100.53). The remaining
    // arc length tracks the live auto-lock fraction; falls back to full ring.
    const ringCircumference = 2 * Math.PI * 16;
    const ringOffset =
      lockFraction === null ? 0 : ringCircumference * (1 - lockFraction);

    return (
      <div
        ref={panelRef}
        className="vault-status-dock-panel vault-status-dock-panel--open vault-status-dock-panel--unlocked"
        data-vault-dock-ignore-activity
        data-testid="vault-status-dock"
        data-vault-state="open"
        data-expanded="true"
        role="status"
        aria-live="polite"
      >
        <div className="mb-3 flex items-center gap-2.5">
          <div className="relative h-[38px] w-[38px] flex-none" aria-hidden="true">
            <svg width="38" height="38" viewBox="0 0 38 38">
              <circle cx="19" cy="19" r="16" fill="none" stroke="var(--border)" strokeWidth="3" />
              <circle
                cx="19"
                cy="19"
                r="16"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 19 19)"
                style={{ transition: "stroke-dashoffset 0.6s linear" }}
              />
            </svg>
            <span className="absolute left-[11px] top-[11px] text-[var(--primary)]">
              <VaultStatusIcon status={status} />
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold text-[var(--foreground)]">
              {expandedCopy.title}
            </div>
            {countdown && (
              <div className="text-xs text-[var(--muted)]">
                Auto-locks in{" "}
                <span className="font-semibold tabular-nums text-[var(--fg-2)]">{countdown}</span>
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={stayUnlocked}
          className="mb-2 w-full rounded-[9px] border border-[var(--border)] bg-[var(--card-2)] px-3 py-2.5 text-[13px] font-semibold text-[var(--foreground)]"
        >
          Stay unlocked 15 min
        </button>
        <button
          type="button"
          onClick={lockNow}
          className="flex w-full items-center justify-center gap-1.5 rounded-[9px] py-2 text-[13px] font-semibold text-[var(--primary)]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="5" y="11" width="14" height="9" rx="2.2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          Lock now
        </button>
      </div>
    );
  }

  if (status === "locked" && showLtgUnlock) {
    return (
      <div
        ref={panelRef}
        className="vault-status-dock-panel vault-status-dock-panel--closed vault-status-dock-panel--narrow"
        data-vault-dock-ignore-activity
        data-testid="vault-status-dock"
        data-vault-state="closed"
        data-expanded="true"
        role="status"
        aria-live="polite"
      >
        <div className="vault-status-dock-panel__head">
          <span className={cn("vault-status-dock__icon vault-status-dock__icon--compact", iconToneClass(status))}>
            <VaultStatusIcon status={status} />
          </span>
          <p className="vault-status-dock-panel__title">{expandedCopy.title}</p>
          <button
            type="button"
            className="vault-status-dock__toggle"
            aria-expanded={true}
            aria-label="Collapse vault status"
            onClick={collapse}
          >
            <VaultStatusDockChevron expanded />
          </button>
        </div>
        <VaultDockQuickUnlock
          loading={vault.loading}
          error={vault.error}
          vaultStatus={serverStatus}
          onUnlockPassword={async (password) => {
            await vault.unlockFromVaultPassword(password);
            vaultClient.recheck();
          }}
          onUnlockPasskey={async (prefetchedOptions) => {
            await vault.unlockFromPasskey(prefetchedOptions);
            vaultClient.recheck();
          }}
        />
        <p className="vault-status-dock-panel__fallback">
          <Link
            href={unlockHref}
            className="vault-status-dock-panel__fallback-link"
            onClick={openFullUnlockPage}
          >
            {fullUnlockLinkLabel}
          </Link>
        </p>
      </div>
    );
  }

  return null;
}
