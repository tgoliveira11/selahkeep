"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildVaultUnlockHref } from "@/lib/notes/safe-return-to";
import { requestVaultDockExpand } from "@/features/vault/vault-status-dock-events";
import { VaultStatusIcon } from "@/features/vault/vault-status-dock-icons";

export type VaultLockedStateVariant =
  | "notes-list"
  | "write"
  | "read-note"
  | "vault-settings"
  | "vault-security";

const NOTES_LIST_BULLETS = [
  "Your account session does not unlock your vault.",
  "Private notes are decrypted only after vault unlock.",
  "The vault auto-locks after inactivity.",
] as const;

interface VaultLockedStateProps {
  variant: VaultLockedStateVariant;
  /** When true, user was writing and vault auto-locked (write variant only). */
  autoLocked?: boolean;
  returnTo?: string;
  embedded?: boolean;
}

function getCopy(variant: VaultLockedStateVariant, autoLocked: boolean) {
  switch (variant) {
    case "notes-list":
      return {
        title: "Your vault is closed",
        lead:
          "SelahKeep keeps your private notes encrypted before they leave this device. Signing in proves who you are, but your vault stays closed until you unlock it with your vault password, recovery phrase, or a compatible passkey.",
        body: "This protects your notes if someone accesses your account session or this browser while your vault is locked.",
        showBullets: true,
      };
    case "write":
      return {
        title: autoLocked ? "Vault closed while writing" : "Unlock to write",
        lead: autoLocked
          ? "Your vault locked after inactivity to protect your private notes. Unsaved work may be saved as an encrypted draft on this device."
          : "Unlock your vault to begin writing. Your note content stays encrypted on this device until you unlock.",
        body: null,
        showBullets: false,
      };
    case "read-note":
      return {
        title: "Unlock to read this note",
        lead: "Your account is signed in, but this note stays encrypted until you unlock your vault on this device.",
        body: null,
        showBullets: false,
      };
    case "vault-settings":
      return {
        title: "Unlock your vault to manage vault settings",
        lead: "Vault settings control unlock behavior and recovery options. Unlock your vault to view and change them.",
        body: null,
        showBullets: false,
      };
    case "vault-security":
      return {
        title: "Unlock your vault to run security checks",
        lead: "Your account is signed in, but your vault remains closed until you unlock it.",
        body: null,
        showBullets: false,
      };
  }
}

export function VaultLockedState({
  variant,
  autoLocked = false,
  returnTo,
  embedded = false,
}: VaultLockedStateProps) {
  const copy = getCopy(variant, autoLocked);
  const fullUnlockHref = buildVaultUnlockHref(returnTo);
  const testId =
    variant === "notes-list" ? "notes-vault-locked-state" : `vault-locked-state-${variant}`;

  const content = (
    <section
      className={variant === "notes-list" ? "notes-vault-locked-state" : "space-y-4"}
      data-testid={testId}
      aria-labelledby={`${testId}-title`}
    >
      {variant === "notes-list" && (
        <div className="notes-vault-locked-state__icon" aria-hidden="true">
          <VaultStatusIcon status="locked" />
        </div>
      )}

      <h2
        id={`${testId}-title`}
        className={
          variant === "notes-list"
            ? "notes-vault-locked-state__title"
            : "text-lg font-semibold text-[var(--foreground)]"
        }
      >
        {copy.title}
      </h2>

      <p
        className={
          variant === "notes-list"
            ? "notes-vault-locked-state__lead"
            : "text-sm leading-relaxed text-[var(--muted)]"
        }
        data-testid={variant === "notes-list" ? "notes-vault-protected-message" : undefined}
      >
        {copy.lead}
      </p>

      {copy.body && (
        <p className="notes-vault-locked-state__body">{copy.body}</p>
      )}

      <div
        className={
          variant === "notes-list"
            ? "notes-vault-locked-state__actions"
            : "flex flex-col gap-2 sm:flex-row sm:flex-wrap"
        }
      >
        <Button
          type="button"
          className="w-full sm:w-auto"
          onClick={() => requestVaultDockExpand()}
        >
          Unlock here
        </Button>
        <Link
          href={fullUnlockHref}
          className={
            variant === "notes-list"
              ? "notes-vault-locked-state__secondary-link"
              : "inline-flex w-full items-center justify-center text-sm font-medium text-[var(--primary)] underline underline-offset-2 sm:w-auto"
          }
          data-testid="vault-open-full-unlock-page"
        >
          Open full unlock page
        </Link>
      </div>

      {copy.showBullets && (
        <ul className="notes-vault-locked-state__bullets">
          {NOTES_LIST_BULLETS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );

  if (embedded) {
    return content;
  }

  return <Card className="p-6">{content}</Card>;
}
