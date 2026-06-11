import AzureADProvider from "next-auth/providers/azure-ad";
import { mapMicrosoftOAuthProfile } from "@/modules/auth/lib/oauth-provider-profile";
import type { MicrosoftProviderEnv } from "@/modules/auth/lib/microsoft-provider-config";

/** Microsoft Entra requires PKCE for authorization code redemption. */
export const MICROSOFT_OAUTH_CHECKS = ["pkce", "state"] as const;

export type MicrosoftAzureAdProviderOptions = Parameters<typeof AzureADProvider>[0] & {
  checks: Array<(typeof MICROSOFT_OAUTH_CHECKS)[number]>;
};

export function buildMicrosoftAzureAdProviderOptions(
  env: MicrosoftProviderEnv
): MicrosoftAzureAdProviderOptions {
  return {
    clientId: env.clientId,
    clientSecret: env.clientSecret,
    tenantId: env.tenantId,
    checks: [...MICROSOFT_OAUTH_CHECKS],
    profile: mapMicrosoftOAuthProfile,
  };
}

export function createMicrosoftAzureAdProvider(env: MicrosoftProviderEnv) {
  return AzureADProvider(buildMicrosoftAzureAdProviderOptions(env));
}
