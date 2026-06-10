"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/layout/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVault } from "@/features/vault/use-vault";
import { vaultApi } from "@/lib/api-client/vault";
import { isVaultUnlocked } from "@/lib/crypto-client/vault";
import { isPasskeySupported } from "@/lib/crypto-client/passkey-vault";

export default function VaultUnlockPage() {
  const { status } = useSession();
  const router = useRouter();
  const {
    loading,
    error,
    initializeVault,
    unlockFromDevice,
    unlockFromPasskey,
    unlockFromRecoveryCode,
    lockVault,
  } = useVault();
  const [vaultStatus, setVaultStatus] = useState<Awaited<ReturnType<typeof vaultApi.status>> | null>(null);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [mode, setMode] = useState<"loading" | "init" | "unlock" | "recovery">("loading");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;

    if (isVaultUnlocked()) {
      router.push("/letters");
      return;
    }

    vaultApi.status().then((s) => {
      setVaultStatus(s);
      if (!s.initialized) {
        setMode("init");
      } else {
        setMode("unlock");
      }
    }).catch(() => setMode("unlock"));
  }, [status, router]);

  async function handleInit() {
    await initializeVault(); // sets session vault key before redirect
    router.push("/letters");
  }

  async function handleUnlock() {
    try {
      await unlockFromDevice();
      router.push("/letters");
    } catch {
      setMode("recovery");
    }
  }

  async function handleRecovery() {
    await unlockFromRecoveryCode(recoveryCode);
    router.push("/letters");
  }

  async function handlePasskeyUnlock() {
    await unlockFromPasskey();
    router.push("/letters");
  }

  const showPasskeyUnlock =
    isPasskeySupported() && (vaultStatus?.hasPasskey ?? false);

  if (status === "loading" || mode === "loading") {
    return (
      <>
        <Nav />
        <main className="max-w-md mx-auto px-4 py-12 text-center">Loading...</main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="max-w-md mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-4">Unlock your vault</h1>
        <p className="text-[var(--muted)] mb-6 text-sm">
          Your letters are protected in a way that our team cannot read or unlock them. To access
          them on this device, unlock your vault.
        </p>

        {mode === "init" && (
          <div className="space-y-4">
            <p>Welcome! Let&apos;s set up your private letter vault.</p>
            <Button onClick={handleInit} disabled={loading} className="w-full">
              {loading ? "Setting up..." : "Set up my vault"}
            </Button>
          </div>
        )}

        {mode === "unlock" && (
          <div className="space-y-4">
            {vaultStatus && (
              <p className="text-sm">
                Recovery status: <strong>{vaultStatus.recoveryState}</strong>
              </p>
            )}
            {showPasskeyUnlock && (
              <Button onClick={handlePasskeyUnlock} disabled={loading} className="w-full">
                {loading ? "Unlocking..." : "Unlock with passkey"}
              </Button>
            )}
            <Button
              onClick={handleUnlock}
              disabled={loading}
              variant={showPasskeyUnlock ? "secondary" : "primary"}
              className="w-full"
            >
              {loading ? "Unlocking..." : "Unlock on this device"}
            </Button>
            <Button variant="secondary" onClick={() => setMode("recovery")} className="w-full">
              Use recovery code
            </Button>
          </div>
        )}

        {mode === "recovery" && (
          <div className="space-y-4">
            {showPasskeyUnlock && (
              <Button onClick={handlePasskeyUnlock} disabled={loading} className="w-full">
                {loading ? "Unlocking..." : "Unlock with passkey"}
              </Button>
            )}
            <p className="text-sm text-[var(--muted)]">
              Enter your recovery code to unlock your vault on this device.
            </p>
            <Input
              type="text"
              placeholder="recovery-code-words-here"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
            />
            <Button onClick={handleRecovery} disabled={loading || !recoveryCode} className="w-full">
              {loading ? "Unlocking..." : "Unlock with recovery code"}
            </Button>
            <Button variant="secondary" onClick={() => setMode("unlock")} className="w-full">
              Back
            </Button>
          </div>
        )}

        {error && <p className="text-[var(--danger)] text-sm mt-4">{error}</p>}
      </main>
    </>
  );
}
