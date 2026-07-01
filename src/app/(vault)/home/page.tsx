"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthenticatedPage } from "@/components/layout/authenticated-page";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { VaultLockedHomeContent } from "@/features/vault/vault-locked-home-content";
import { NotesWelcome } from "@/features/vault/notes-welcome";
import { useRequireVault } from "@/features/vault/use-require-vault";
import { useVaultClientStatus } from "@/features/vault/use-vault-client-status";

/**
 * Logged-in home when the vault is locked. Auth-only (no vault unlock required).
 * Unlocked users are sent to /notes; vault setup prompts stay on dedicated flows.
 */
export default function LoggedInHomePage() {
  const vault = useRequireVault();
  const vaultClient = useVaultClientStatus();
  const router = useRouter();

  const clientStatus = vaultClient.status === "ready" ? vaultClient.clientStatus : null;

  useEffect(() => {
    if (clientStatus === "unlocked") {
      router.replace("/notes");
    }
  }, [clientStatus, router]);

  useEffect(() => {
    if (clientStatus === "setup_incomplete") {
      router.replace("/vault/setup");
    }
  }, [clientStatus, router]);

  if (
    vault.status === "loading" ||
    vault.status === "redirecting" ||
    vaultClient.status === "loading" ||
    clientStatus === "unlocked" ||
    clientStatus === "setup_incomplete"
  ) {
    return (
      <AuthenticatedPage width="notes">
        <LoadingState label="Loading SelahKeep" />
      </AuthenticatedPage>
    );
  }

  if (vault.status === "error" || vaultClient.status === "error") {
    return (
      <AuthenticatedPage width="notes">
        <ErrorState
          message={
            vault.status === "error"
              ? vault.message
              : vaultClient.status === "error"
                ? vaultClient.message
                : "Failed to load your workspace"
          }
        />
      </AuthenticatedPage>
    );
  }

  if (clientStatus === "not_configured") {
    return (
      <AuthenticatedPage width="notes">
        <NotesWelcome />
      </AuthenticatedPage>
    );
  }

  return (
    <AuthenticatedPage width="notes">
      <VaultLockedHomeContent />
    </AuthenticatedPage>
  );
}
