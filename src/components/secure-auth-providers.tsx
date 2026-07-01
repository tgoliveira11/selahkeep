"use client";

import type { SecureAuthUIPublicConfig } from "@tgoliveira/secure-auth/react";
import { SecureAuthUIProvider } from "@tgoliveira/secure-auth/react";
import { SessionProvider } from "next-auth/react";
import { VaultProviders } from "@/components/vault-providers";

export function SecureAuthProviders({
  uiConfig,
  children,
}: {
  uiConfig: SecureAuthUIPublicConfig;
  children: React.ReactNode;
}) {
  const pollSeconds = uiConfig.sessionPolicy.revocationPollIntervalSeconds;
  const refetchInterval = pollSeconds > 0 ? pollSeconds : undefined;

  return (
    <SessionProvider refetchInterval={refetchInterval}>
      <SecureAuthUIProvider config={uiConfig}>
        <VaultProviders>{children}</VaultProviders>
      </SecureAuthUIProvider>
    </SessionProvider>
  );
}
