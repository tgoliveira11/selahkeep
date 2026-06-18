"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { AccountSettingsPage, SecuritySettingsPage } from "@tgoliveira/secure-auth/react";
import { defaultSignOutAccount } from "@tgoliveira/secure-auth/react/client";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/page-layout";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { APP_PASSKEY_SLUG } from "@/lib/passkey/app-slug";
import { clearVaultClientState } from "@/lib/crypto-client/vault";
import { ACCOUNT_DELETION_VAULT_NOTE } from "@/lib/account-auth-messages";
import { Alert } from "@/components/ui/alert";

export default function AccountSettingsPageWrapper() {
  const { data: session } = useSession();

  return (
    <PageLayout width="medium">
      <PageHeader
        title="Account settings"
        description="Manage sign-in, security, and account lifecycle for SelahKeep."
      />

      <div className="space-y-5">
        <Alert variant="warning" title="Before you delete your account">
          {ACCOUNT_DELETION_VAULT_NOTE}
        </Alert>

        <Card className="space-y-4 p-5 sm:p-6">
          <AccountSettingsPage
            appSlug={APP_PASSKEY_SLUG}
            afterDeletePath="/account-deleted"
            onSignOut={async () => {
              if (session?.user?.id) {
                try {
                  await clearVaultClientState(session.user.id);
                } catch {
                  // Continue sign-out even if local vault cleanup fails.
                }
              }
              await defaultSignOutAccount();
            }}
          />
        </Card>

        <Card id="security" className="scroll-mt-8 space-y-4 p-5 sm:p-6">
          <div className="space-y-1 border-b border-[var(--border)] pb-3">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Security</h2>
            <p className="text-sm text-[var(--muted)]">
              Password, two-factor authentication, and account passkeys for sign-in.
            </p>
          </div>
          <SecuritySettingsPage appSlug={APP_PASSKEY_SLUG} />
        </Card>

        <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="space-y-1">
            <h2 className="font-medium text-[var(--foreground)]">Vault protection</h2>
            <p className="text-sm text-[var(--muted)]">
              Passkey vault unlock, recovery phrase, and unlock behavior are managed separately from
              account sign-in.
            </p>
          </div>
          <Link href="/vault/settings" className="shrink-0">
            <Button variant="secondary" className="w-full sm:w-auto">
              Open vault settings
            </Button>
          </Link>
        </Card>
      </div>
    </PageLayout>
  );
}
