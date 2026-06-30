import { readBoolEnv, readEnv, readIntEnv } from "@/lib/env/parse";
import { getEmailConfig, getSmtpConfig, type EmailProvider } from "@/modules/email/core/config";

export type OutpostEnvConfig = {
  adminEnabled: boolean;
  adminPath: string;
  recipientHmacKey: string;
  emailProvider: EmailProvider;
};

export function buildOutpostEnvConfig(env: NodeJS.ProcessEnv = process.env): OutpostEnvConfig {
  const authAdminEnabled = readBoolEnv(env, "AUTH_ADMIN_ENABLED", false);
  const adminEnabled = readBoolEnv(env, "OUTPOST_ADMIN_ENABLED", authAdminEnabled);
  const adminPath = readEnv(env, "OUTPOST_ADMIN_PATH") ?? "/admin/outpost";

  const recipientHmacKey =
    readEnv(env, "OUTPOST_RECIPIENT_HMAC_KEY") ??
    readEnv(env, "NEXTAUTH_SECRET") ??
    "dev-only-outpost-hmac-key";

  const { provider: emailProvider } = getEmailConfig();

  return {
    adminEnabled,
    adminPath,
    recipientHmacKey,
    emailProvider,
  };
}

export function readOutpostAdminConfigCacheTtl(env: NodeJS.ProcessEnv = process.env): number {
  return readIntEnv(env, "OUTPOST_ADMIN_CONFIG_CACHE_TTL_SECONDS", 60, { min: 0 });
}

export { getSmtpConfig };
