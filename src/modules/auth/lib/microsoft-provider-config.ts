/**
 * Microsoft sign-in via NextAuth v4 Azure AD provider (Microsoft identity platform).
 * Provider ID determines callback URL: /api/auth/callback/azure-ad
 */
export const MICROSOFT_OAUTH_PROVIDER_ID = "azure-ad" as const;

export const MICROSOFT_OAUTH_SCOPES = "openid profile email" as const;

/** Microsoft Entra "Application (client) ID" must be a GUID. */
export const MICROSOFT_APPLICATION_CLIENT_ID_GUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MICROSOFT_TENANT_ALIASES = new Set([
  "common",
  "organizations",
  "consumers",
]);

export type MicrosoftProviderEnv = {
  clientId: string;
  clientSecret: string;
  tenantId: string;
};

export type MicrosoftProviderConfigIssue =
  | "missing_credentials"
  | "invalid_client_id_format"
  | "invalid_tenant_id_format";

export function isValidMicrosoftApplicationClientId(value: string): boolean {
  return MICROSOFT_APPLICATION_CLIENT_ID_GUID.test(value.trim());
}

export function isValidMicrosoftTenantId(value: string): boolean {
  const trimmed = value.trim();
  if (MICROSOFT_TENANT_ALIASES.has(trimmed)) return true;
  return isValidMicrosoftApplicationClientId(trimmed);
}

function readEnvValue(env: NodeJS.ProcessEnv, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function describeMicrosoftProviderConfigIssue(
  env: NodeJS.ProcessEnv = process.env
): MicrosoftProviderConfigIssue | null {
  const clientId = readEnvValue(env, "AUTH_AZURE_AD_ID", "AUTH_MICROSOFT_ID");
  const clientSecret = readEnvValue(env, "AUTH_AZURE_AD_SECRET", "AUTH_MICROSOFT_SECRET");

  if (!clientId || !clientSecret) {
    return clientId || clientSecret ? "missing_credentials" : null;
  }

  if (!isValidMicrosoftApplicationClientId(clientId)) {
    return "invalid_client_id_format";
  }

  const tenantRaw = readEnvValue(env, "AUTH_AZURE_AD_TENANT_ID", "AUTH_MICROSOFT_TENANT_ID");
  const tenantId = tenantRaw && tenantRaw.length > 0 ? tenantRaw : "common";
  if (!isValidMicrosoftTenantId(tenantId)) {
    return "invalid_tenant_id_format";
  }

  return null;
}

export function readMicrosoftProviderEnv(
  env: NodeJS.ProcessEnv = process.env
): MicrosoftProviderEnv | null {
  if (describeMicrosoftProviderConfigIssue(env)) {
    return null;
  }

  const clientId = readEnvValue(env, "AUTH_AZURE_AD_ID", "AUTH_MICROSOFT_ID");
  const clientSecret = readEnvValue(env, "AUTH_AZURE_AD_SECRET", "AUTH_MICROSOFT_SECRET");
  if (!clientId || !clientSecret) return null;

  const tenantRaw = readEnvValue(env, "AUTH_AZURE_AD_TENANT_ID", "AUTH_MICROSOFT_TENANT_ID");
  const tenantId = tenantRaw && tenantRaw.length > 0 ? tenantRaw : "common";

  return { clientId, clientSecret, tenantId };
}

export function isMicrosoftProviderConfigured(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return readMicrosoftProviderEnv(env) !== null;
}
