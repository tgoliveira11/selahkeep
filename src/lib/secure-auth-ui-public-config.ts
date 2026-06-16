import { buildSecureAuthUiPublicConfigFromEnv } from "@/lib/env/secure-auth-from-env";

/** Build-time safe UI config for React providers (no server secrets required). */
export const secureAuthUiPublicConfig = buildSecureAuthUiPublicConfigFromEnv();
