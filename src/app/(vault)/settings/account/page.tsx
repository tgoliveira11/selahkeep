"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/layout/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ACCOUNT_DELETION_CONFIRMATION_PHRASE } from "@/lib/account-deletion";
import { accountApi } from "@/lib/api-client/account";
import { clearVaultClientState } from "@/lib/crypto-client/vault";

export default function AccountSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requiresPassword, setRequiresPassword] = useState(true);
  const [authProvider, setAuthProvider] = useState<string>("credentials");
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status !== "authenticated") return;

    accountApi
      .getDeletionRequirements()
      .then((requirements) => {
        setRequiresPassword(requirements.requiresPassword);
        setAuthProvider(requirements.authProvider);
      })
      .catch(() => setError("Could not load account settings."));
  }, [status, router]);

  const phraseMatches = confirmationPhrase === ACCOUNT_DELETION_CONFIRMATION_PHRASE;
  const passwordReady = !requiresPassword || password.length > 0;
  const canDelete = phraseMatches && passwordReady && !loading;

  async function handleDeleteAccount() {
    if (!session?.user?.id || !canDelete) return;

    setLoading(true);
    setError(null);

    try {
      await accountApi.deleteAccount({
        confirmationPhrase,
        password: requiresPassword ? password : undefined,
      });

      try {
        await clearVaultClientState(session.user.id);
      } catch {
        // Continue sign-out even if local cleanup fails.
      }

      await signOut({ callbackUrl: `${window.location.origin}/account-deleted` });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Account deletion failed");
      setLoading(false);
    }
  }

  return (
    <>
      <Nav />
      <main className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Account settings</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Manage your account and permanently delete your data from active storage.
          </p>
        </div>

        <section className="rounded-lg border border-[var(--border)] bg-white p-6 space-y-4">
          <h2 className="text-lg font-medium text-[var(--danger)]">Delete account</h2>
          <p className="text-sm text-[var(--muted)]">
            This permanently removes your account, encrypted letters, vault envelopes, trusted
            devices, passkeys, and recovery metadata from active storage. This action cannot be
            undone.
          </p>
          <p className="text-sm text-[var(--muted)]">
            Private letter content and key material will not remain in active storage after deletion.
            Backups or logs outside active storage are governed by the backup and retention policy.
          </p>

          {requiresPassword ? (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="delete-password">
                Re-enter your password
              </label>
              <Input
                id="delete-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Signed in with {authProvider}. Confirm deletion with the phrase below using your
              current session.
            </p>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="delete-phrase">
              Type <code>{ACCOUNT_DELETION_CONFIRMATION_PHRASE}</code> to confirm
            </label>
            <Input
              id="delete-phrase"
              value={confirmationPhrase}
              onChange={(e) => setConfirmationPhrase(e.target.value)}
              placeholder={ACCOUNT_DELETION_CONFIRMATION_PHRASE}
            />
          </div>

          <Button
            variant="danger"
            className="w-full"
            disabled={!canDelete}
            onClick={handleDeleteAccount}
          >
            {loading ? "Deleting account..." : "Delete my account permanently"}
          </Button>

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        </section>
      </main>
    </>
  );
}
