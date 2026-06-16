"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { signOutAccount } from "@/lib/auth/sign-out-client";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { ACCOUNT_DELETION_CONFIRMATION_PHRASE } from "@/lib/account-deletion";
import { accountApi } from "@/lib/api-client/account";
import { vaultApi, type VaultStatus } from "@/lib/api-client/vault";
import { clearVaultClientState } from "@/lib/crypto-client/vault";
import { formatAuthProvider } from "@/lib/ui/format-auth-provider";
import { getRecoveryStateLabel } from "@/lib/ui/recovery-state-labels";
import { TwoFactorSettings } from "@/components/settings/two-factor-settings";
import { PasskeySettings } from "@/components/settings/passkey-settings";
import { EmailVerificationSettings } from "@/components/settings/email-verification-settings";
import { ChangePasswordSettings } from "@tgoliveira/secure-auth/react";
import { ActiveSessionsSettings } from "@/components/settings/active-sessions-settings";
import { accountAuthApi, type AccountAuthStatus } from "@/lib/api-client/account-auth";

export default function AccountSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requiresPassword, setRequiresPassword] = useState(true);
  const [authProvider, setAuthProvider] = useState<string>("credentials");
  const [authStatus, setAuthStatus] = useState<AccountAuthStatus | null>(null);
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
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

    let cancelled = false;

    (async () => {
      try {
        const [requirements, statusResult, accountAuthStatus] = await Promise.all([
          accountApi.getDeletionRequirements(),
          vaultApi.status().catch(() => null),
          accountAuthApi.getStatus().catch(() => null),
        ]);
        if (cancelled) return;
        setRequiresPassword(requirements.requiresPassword);
        setAuthProvider(requirements.authProvider);
        setVaultStatus(statusResult);
        setAuthStatus(accountAuthStatus);
      } catch {
        if (!cancelled) setError("Could not load account settings.");
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, router]);

  const phraseMatches = confirmationPhrase === ACCOUNT_DELETION_CONFIRMATION_PHRASE;
  const passwordReady = !requiresPassword || password.length > 0;
  const canDelete = phraseMatches && passwordReady && !loading;
  const recoveryLabel = vaultStatus ? getRecoveryStateLabel(vaultStatus.recoveryState) : null;

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

      await signOutAccount();
      router.push("/account-deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Account deletion failed");
      setLoading(false);
    }
  }

  if (status === "loading" || overviewLoading) {
    return (
      <PageLayout width="medium">
        <LoadingState label="Loading account settings" />
      </PageLayout>
    );
  }

  return (
    <PageLayout width="medium">
      <PageHeader
        title="Account settings"
        description="Review how you sign in and manage recovery. No private letter content is shown here."
      />

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Account overview</CardTitle>
          <CardDescription>Basic account details and links to recovery tools.</CardDescription>
        </CardHeader>

        <dl className="space-y-4 text-sm">
          <div>
            <dt className="font-medium text-[var(--muted)]">Email</dt>
            <dd>{session?.user?.email ?? "Not available"}</dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--muted)]">Sign-in method</dt>
            <dd>{formatAuthProvider(authProvider)}</dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--muted)]">Recovery protection</dt>
            <dd className="space-y-2">
              {recoveryLabel ? (
                <>
                  <Badge
                    variant={
                      recoveryLabel.variant === "success"
                        ? "success"
                        : recoveryLabel.variant === "danger"
                          ? "danger"
                          : "muted"
                    }
                  >
                    {recoveryLabel.label}
                  </Badge>
                  <p className="text-[var(--muted)]">{recoveryLabel.description}</p>
                </>
              ) : (
                <p className="text-[var(--muted)]">Recovery status unavailable right now.</p>
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/vault/devices">
            <Button variant="secondary" className="w-full sm:w-auto">
              Trusted devices
            </Button>
          </Link>
          <Link href="/vault/recovery">
            <Button variant="secondary" className="w-full sm:w-auto">
              Recovery code & passkey
            </Button>
          </Link>
        </div>
      </Card>

      {authStatus?.hasPassword && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Email verification</CardTitle>
            <CardDescription>Confirm your email address for this account.</CardDescription>
          </CardHeader>
          <EmailVerificationSettings
            email={authStatus.email}
            emailVerified={authStatus.emailVerified}
            onStatusChange={() => {
              void accountAuthApi.getStatus().then(setAuthStatus).catch(() => undefined);
            }}
          />
        </Card>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Update the password you use to sign in with email.</CardDescription>
        </CardHeader>
        <ChangePasswordSettings
          canChangePassword={authStatus?.canChangePassword ?? false}
          authProvider={authStatus?.authProvider ?? authProvider}
        />
      </Card>

      {session?.user?.id && <PasskeySettings userId={session.user.id} />}

      <TwoFactorSettings />

      <Card className="mb-8 border-[var(--danger-muted)]">
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>
            Browsers and devices signed in to your account — separate from trusted devices for
            vault unlock.
          </CardDescription>
        </CardHeader>
        <ActiveSessionsSettings />
      </Card>

      <Card className="border-[var(--danger-muted)]">
        <CardHeader>
          <CardTitle className="text-[var(--danger)]">Delete account</CardTitle>
          <CardDescription>
            This permanently removes your account, encrypted letters, trusted devices, passkeys, and
            recovery settings from active storage. This cannot be undone.
          </CardDescription>
        </CardHeader>

        <div className="space-y-4">
          <Alert variant="warning">
            Private letter content will not remain in active storage after deletion. Backups or logs
            outside active storage follow our backup and retention policy.
          </Alert>

          {requiresPassword ? (
            <FormField id="delete-password" label="Re-enter your password">
              <Input
                id="delete-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Signed in with {formatAuthProvider(authProvider)}. Confirm deletion with the phrase
              below using your current session.
            </p>
          )}

          <FormField
            id="delete-phrase"
            label={`Type "${ACCOUNT_DELETION_CONFIRMATION_PHRASE}" to confirm`}
          >
            <Input
              id="delete-phrase"
              value={confirmationPhrase}
              onChange={(e) => setConfirmationPhrase(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </FormField>

          <Button
            variant="danger"
            className="w-full"
            disabled={!canDelete}
            onClick={handleDeleteAccount}
          >
            {loading ? "Deleting account…" : "Delete my account permanently"}
          </Button>

          {error && (
            <Alert variant="danger" role="alert">
              {error}
            </Alert>
          )}
        </div>
      </Card>
    </PageLayout>
  );
}
