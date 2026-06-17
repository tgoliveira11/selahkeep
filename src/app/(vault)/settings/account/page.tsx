"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { AccountSettingsPage, SecuritySettingsPage } from "@tgoliveira/secure-auth/react";
import { defaultSignOutAccount } from "@tgoliveira/secure-auth/react/client";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/page-layout";
import { Card } from "@/components/ui/card";
import { APP_PASSKEY_SLUG } from "@/lib/passkey/app-slug";
import { clearVaultClientState, isVaultUnlocked } from "@/lib/crypto-client/vault";
import { PasskeyVaultUnlockSetup } from "@/features/passkey/passkey-vault-unlock-setup";

export default function AccountSettingsPageWrapper() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const vaultUnlocked = isVaultUnlocked();

  return (
    <PageLayout width="medium">
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
        footer={
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
        }
      />
      <div id="security" className="mt-10 scroll-mt-8">
        <SecuritySettingsPage appSlug={APP_PASSKEY_SLUG} />
      </div>
      {userId && (
        <Card className="mt-10 space-y-4 p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Passkey vault unlock</h2>
          <PasskeyVaultUnlockSetup userId={userId} vaultUnlocked={vaultUnlocked} />
        </Card>
      )}
    </PageLayout>
  );
}
