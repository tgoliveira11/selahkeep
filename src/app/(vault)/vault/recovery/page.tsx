"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/layout/nav";
import { Button } from "@/components/ui/button";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postponed, setPostponed] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await vaultApi.status();
      setVaultStatus(status);
    } catch {
      setVaultStatus(null);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated" && !isVaultUnlocked()) router.push("/vault/unlock");
    else if (status === "authenticated") refreshStatus();
  }, [status, router, refreshStatus]);

  async function handleGenerate() {
    const vaultKey = getSessionVaultKey();
    if (!vaultKey) {
      setError("Vault must be unlocked to generate a recovery code");
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

  const hasRecoveryCode = vaultStatus?.hasRecoveryCode ?? false;
  const hasPasskey = vaultStatus?.hasPasskey ?? false;
  const showRecoverySetup = !hasRecoveryCode && !recoveryCode && !saved && !postponed;

  return (
    <>
      <Nav />
      <main className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Recovery methods</h1>
        <p className="text-sm text-[var(--muted)] mb-6">
          Set up ways to access your private letters if you lose this device.
        </p>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Recovery code</h2>

          {hasRecoveryCode && !recoveryCode && (
            <p className="text-sm text-green-700">
              Your recovery code is set up. It cannot be shown again — keep the copy you saved
              somewhere safe.
            </p>
          )}

          {showRecoverySetup && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted)]">
                Save your recovery code to make sure you can access your private letters if you lose
                this device. Because your letters are private, our team cannot recover them for you
                without one of your recovery methods.
              </p>
              <Button onClick={handleGenerate} disabled={loading} className="w-full">
                {loading ? "Generating..." : "Generate recovery code"}
              </Button>
              <Button variant="secondary" onClick={() => setPostponed(true)} className="w-full">
                Do this later
              </Button>
            </div>
          )}

          {recoveryCode && !saved && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-[var(--danger)]">
                Save this code now. It will not be shown again.
              </p>
              <div className="p-4 bg-gray-100 rounded-lg font-mono text-sm break-all select-all">
                {recoveryCode}
              </div>
              <Button onClick={handleConfirmSaved} className="w-full">
                I have saved my recovery code
              </Button>
            </div>
          )}

          {saved && !hasRecoveryCode && (
            <p className="text-sm text-green-700">Recovery code saved successfully.</p>
          )}

          {postponed && !hasRecoveryCode && (
            <p className="text-sm text-[var(--muted)]">
              You can do this later. Just remember: if you lose access to this device before setting
              up another recovery method, we may not be able to restore your private letters.
            </p>
          )}
        </section>

        <hr className="my-8 border-[var(--border)]" />

        <section>
          <h2 className="text-lg font-semibold mb-3">Passkey</h2>
          {session?.user?.id && (
            <PasskeySetup
              userId={session.user.id}
              hasPasskey={hasPasskey}
              onStatusChange={refreshStatus}
            />
          )}
        </section>

        {error && <p className="text-[var(--danger)] text-sm mt-4">{error}</p>}
      </main>
    </>
  );
}
