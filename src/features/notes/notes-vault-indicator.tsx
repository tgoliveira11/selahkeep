"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { lockVaultSession } from "@/lib/crypto-client/vault-session";
import type { VaultClientStatus } from "@/lib/vault/vault-status";
import { getVaultStatusCopy } from "@/lib/vault/vault-status";
import { cn } from "@/lib/ui/cn";

interface NotesVaultIndicatorProps {
  clientStatus: VaultClientStatus;
  className?: string;
}

function statusLabel(clientStatus: VaultClientStatus): string {
  switch (clientStatus) {
    case "unlocked":
      return "Vault open";
    case "locked":
      return "Vault locked";
    case "not_configured":
      return "Vault not set up";
    case "setup_incomplete":
      return "Vault setup incomplete";
  }
}

function VaultGlyph({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-[var(--radius)] border text-xl",
        open
          ? "border-[var(--success)] bg-[var(--success-muted)] text-[var(--success)]"
          : "border-[var(--border)] bg-[var(--card-muted)] text-[var(--muted)]"
      )}
    >
      {open ? "🔓" : "🔒"}
    </span>
  );
}

export function NotesVaultIndicator({ clientStatus, className }: NotesVaultIndicatorProps) {
  const copy = getVaultStatusCopy(clientStatus, "notes");
  const label = statusLabel(clientStatus);
  const isOpen = clientStatus === "unlocked";

  if (clientStatus === "unlocked") {
    return (
      <div
        className={cn(
          "mb-6 flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between",
          className
        )}
        data-testid="notes-vault-indicator"
        data-vault-state="open"
      >
        <div className="flex items-center gap-3">
          <VaultGlyph open />
          <div>
            <p className="font-medium text-[var(--foreground)]">{label}</p>
            <p className="text-sm text-[var(--muted)]">Your private notes are available on this device.</p>
          </div>
        </div>
        <Button type="button" variant="secondary" onClick={() => lockVaultSession()}>
          Lock vault
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      data-testid="notes-vault-indicator"
      data-vault-state="closed"
    >
      <div className="flex items-center gap-3">
        <Link href={copy.actionHref} className="rounded-[var(--radius)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">
          <VaultGlyph open={false} />
        </Link>
        <div>
          <p className="font-medium text-[var(--foreground)]">{label}</p>
          <p className="text-sm text-[var(--muted)]">{copy.promptDescription}</p>
        </div>
      </div>
      <Link href={copy.actionHref}>
        <Button className="w-full sm:w-auto">{copy.promptCta}</Button>
      </Link>
    </div>
  );
}
