"use client";

import { useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { VaultAccessGate } from "@/features/vault/vault-access-gate";
import { useRequireVault } from "@/features/vault/use-require-vault";
import { useVaultSettings } from "@/features/notes/use-vault-settings";
import type { VaultUnlockBehavior } from "@/lib/crypto-client/vault-settings";
import { applyUnlockBehavior } from "@/features/notes/eager-decrypt-notes";

const OPTIONS: Array<{
  value: VaultUnlockBehavior;
  title: string;
  description: string;
}> = [
  {
    value: "metadata_only",
    title: "Metadata only (recommended)",
    description:
      "After unlock, decrypt note titles and organization data for search and filters. Note bodies decrypt only when you open a note. Lower memory use and faster unlock.",
  },
  {
    value: "decrypt_all",
    title: "Decrypt all note bodies",
    description:
      "After unlock, eagerly decrypt every note body in memory. Faster browsing when opening notes, but higher memory exposure on this device until you lock the vault.",
  },
];

export default function VaultSettingsPage() {
  const vault = useRequireVault();
  const userId = vault.status === "ready" ? vault.userId : null;
  const vaultUnlocked = vault.status === "ready" ? vault.vaultUnlocked : false;
  const { settings, loading, error, updateUnlockBehavior } = useVaultSettings(userId, vaultUnlocked);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSelect(behavior: VaultUnlockBehavior) {
    if (!settings || settings.unlockBehavior === behavior) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await updateUnlockBehavior(behavior);
      if (userId) {
        await applyUnlockBehavior(userId);
      }
      setSaved(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (vault.status === "loading" || vault.status === "redirecting") {
    return (
      <PageLayout>
        <LoadingState label="Loading vault settings" />
      </PageLayout>
    );
  }

  if (vault.status === "error") {
    return (
      <PageLayout>
        <ErrorState message={vault.message} />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title="Vault settings"
        description="Control how your vault behaves after unlock on this device."
      />

      {!vaultUnlocked ? (
        <Card>
          <VaultAccessGate
            purpose="read"
            onAccessGranted={() => {
              vault.recheckVault();
            }}
          />
        </Card>
      ) : loading ? (
        <LoadingState label="Loading settings" />
      ) : (
        <div className="space-y-4">
          {error && <ErrorState message={error} />}
          {saveError && (
            <Alert variant="danger" role="alert">
              {saveError}
            </Alert>
          )}
          {saved && (
            <Alert variant="success" title="Saved">
              Unlock behavior updated for this vault.
            </Alert>
          )}

          <Card className="space-y-2 border-dashed">
            <h2 className="font-medium">Import and export</h2>
            <p className="text-sm text-[var(--muted)]">
              Bulk import and export of decrypted notes are not available in this MVP. Your notes
              stay encrypted on our servers and can only be read after you unlock your vault in the
              browser. Encrypted attachments and version history are also not available yet.
            </p>
          </Card>

          {OPTIONS.map((option) => {
            const selected = settings?.unlockBehavior === option.value;
            return (
              <Card
                key={option.value}
                className={`space-y-2 ${selected ? "ring-2 ring-[var(--primary)]" : ""}`}
              >
                <h2 className="font-medium">{option.title}</h2>
                <p className="text-sm text-[var(--muted)]">{option.description}</p>
                <Button
                  variant={selected ? undefined : "secondary"}
                  disabled={saving || selected}
                  onClick={() => handleSelect(option.value)}
                >
                  {selected ? "Current setting" : "Use this setting"}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}
