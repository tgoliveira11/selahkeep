"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { AccountSettingsPage } from "@tgoliveira/secure-auth/react";
import { defaultSignOutAccount } from "@tgoliveira/secure-auth/react/client";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/page-layout";
import { APP_PASSKEY_SLUG } from "@/lib/passkey/app-slug";
import { clearVaultClientState } from "@/lib/crypto-client/vault";

export default function AccountSettingsPageWrapper() {
  const { data: session } = useSession();

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
        }
      />
    </PageLayout>
  );
}
