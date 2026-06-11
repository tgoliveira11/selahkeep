"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { RecoveryNotice } from "@/components/ui/recovery-notice";
import { SuccessState } from "@/components/ui/success-state";
import { generateRecoveryCode, wrapVaultKeyForRecovery } from "@/lib/crypto-client";
import { getSessionVaultKey } from "@/lib/crypto-client/vault";
import { vaultApi, type VaultStatus } from "@/lib/api-client/vault";
import { isVaultUnlocked } from "@/lib/crypto-client/vault";
import { PasskeySetup } from "@/features/recovery/passkey-setup";

export default function RecoveryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postponed, setPostponed] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const nextStatus = await vaultApi.status();
      setVaultStatus(nextStatus);
    } catch {
      setVaultStatus(null);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated" && !isVaultUnlocked()) router.push("/vault/unlock");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !isVaultUnlocked()) return;

    let cancelled = false;

    (async () => {
      try {
        const nextStatus = await vaultApi.status();
        if (!cancelled) setVaultStatus(nextStatus);
      } catch {
        if (!cancelled) setVaultStatus(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);

  async function handleGenerate() {
    const vaultKey = getSessionVaultKey();
    if (!vaultKey) {
      setError("Unlock your vault before generating a recovery code.");
      return;
    }

    const userId = session?.user?.id;
    if (!userId) {
      setError("Not authenticated");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const code = generateRecoveryCode();
      const { encryptedVaultKey, kdfMetadata } = await wrapVaultKeyForRecovery(
        vaultKey,
        code,
        userId,
        userId
      );
      await vaultApi.storeRecoveryCode({ encryptedVaultKey, kdfMetadata });
      setRecoveryCode(code);
      setCopied(false);
      await refreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate recovery code");
    } finally {
      setLoading(false);
    }
  }

  function handleConfirmSaved() {
    setSaved(true);
    setRecoveryCode(null);
    refreshStatus();
  }

  async function handleCopyCode() {
    if (!recoveryCode) return;
    try {
      await navigator.clipboard.writeText(recoveryCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const hasRecoveryCode = vaultStatus?.hasRecoveryCode ?? false;
  const hasPasskey = vaultStatus?.hasPasskey ?? false;
  const showRecoverySetup = !hasRecoveryCode && !recoveryCode && !saved && !postponed;

  return (
    <PageLayout width="medium">
      <PageHeader
        title="Recovery methods"
        description="Set up calm, practical ways to access your private letters if you lose this device."
      />

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Recovery code</CardTitle>
            <CardDescription>
              A recovery code lets you unlock your letters on a new browser. Save it somewhere safe
              offline — we cannot show it again.
            </CardDescription>
          </CardHeader>

          {hasRecoveryCode && !recoveryCode && (
            <SuccessState message="Your recovery code is set up. Keep the copy you saved somewhere safe." />
          )}

          {showRecoverySetup && (
            <div className="space-y-4">
              <RecoveryNotice />
              <Button onClick={handleGenerate} disabled={loading} className="w-full sm:w-auto">
                {loading ? "Generating…" : "Generate recovery code"}
              </Button>
              <Button variant="secondary" onClick={() => setPostponed(true)} className="w-full sm:w-auto">
                Do this later
              </Button>
            </div>
          )}

          {recoveryCode && !saved && (
            <div className="space-y-4">
              <Alert variant="warning" title="Save this code now">
                This is the only time we can show it. Store it offline — a notebook, password manager,
                or printed copy.
              </Alert>
              <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card-muted)] p-4 font-mono text-sm leading-relaxed break-all select-all">
                {recoveryCode}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="secondary" onClick={handleCopyCode}>
                  {copied ? "Copied" : "Copy code"}
                </Button>
                <Button onClick={handleConfirmSaved}>I have saved my recovery code</Button>
              </div>
            </div>
          )}

          {postponed && !hasRecoveryCode && (
            <Alert variant="muted" className="mt-4">
              You can return anytime. If you lose this device before setting up another recovery
              method, your private letters may be unrecoverable — we cannot restore them for you.
            </Alert>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Passkey</CardTitle>
            <CardDescription>
              Use your device PIN, fingerprint, or face recognition to unlock your vault on a new
              device — when your browser supports it.
            </CardDescription>
          </CardHeader>
          {session?.user?.id && (
            <PasskeySetup
              userId={session.user.id}
              hasPasskey={hasPasskey}
              onStatusChange={refreshStatus}
            />
          )}
        </Card>
      </div>

      {error && (
        <Alert variant="danger" className="mt-6" role="alert">
          {error}
        </Alert>
      )}
    </PageLayout>
  );
}
