"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buildVaultUnlockHref } from "@/lib/notes/safe-return-to";
import { requestVaultDockExpand } from "@/features/vault/vault-status-dock-events";
import { VaultStatusIcon } from "@/features/vault/vault-status-dock-icons";

const SECURITY_BULLETS = [
  "Your account session does not unlock your vault.",
  "Private notes are decrypted only after vault unlock.",
  "The vault auto-locks after inactivity.",
] as const;

/** Helpful locked-vault state for /notes — no decrypted note content. */
export function NotesVaultProtectedMessage() {
  const fullUnlockHref = buildVaultUnlockHref("/notes");

  return (
    <section
      className="notes-vault-locked-state"
      data-testid="notes-vault-locked-state"
      aria-labelledby="notes-vault-locked-title"
    >
      <div className="notes-vault-locked-state__icon" aria-hidden="true">
        <VaultStatusIcon status="locked" />
      </div>

      <h2 id="notes-vault-locked-title" className="notes-vault-locked-state__title">
        Your vault is closed
      </h2>

      <p className="notes-vault-locked-state__lead" data-testid="notes-vault-protected-message">
        SelahKeep keeps your private notes encrypted before they leave this device. Signing in
        proves who you are, but your vault stays closed until you unlock it with your vault
        password, recovery phrase, or a compatible passkey.
      </p>

      <p className="notes-vault-locked-state__body">
        This protects your notes if someone accesses your account session or this browser while
        your vault is locked.
      </p>

      <div className="notes-vault-locked-state__actions">
        <Button type="button" className="w-full sm:w-auto" onClick={() => requestVaultDockExpand()}>
          Unlock vault
        </Button>
        <Link
          href={fullUnlockHref}
          className="notes-vault-locked-state__secondary-link"
          data-testid="notes-open-full-unlock-page"
        >
          Open full unlock page
        </Link>
      </div>

      <ul className="notes-vault-locked-state__bullets">
        {SECURITY_BULLETS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
