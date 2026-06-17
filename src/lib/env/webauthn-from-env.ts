import { readEnv, readEnvWithLegacy } from "@/lib/env/parse";

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

function hostnameFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export type ResolvedWebAuthnSettings = {
  origin: string;
  rpId: string;
  rpName: string;
  appBaseUrl: string;
};

/**
 * Single source of truth for WebAuthn env.
 * RP ID must be the hostname users visit (or a registrable parent domain).
 */
export function resolveWebAuthnSettings(
  env: NodeJS.ProcessEnv = process.env,
  defaults?: { appName?: string; baseUrl?: string }
): ResolvedWebAuthnSettings {
  const appBaseUrl = normalizeOrigin(
    readEnvWithLegacy(env, "APP_BASE_URL", "NEXTAUTH_URL") ??
      defaults?.baseUrl ??
      "http://localhost:3001"
  );
  const origin = normalizeOrigin(readEnv(env, "WEBAUTHN_ORIGIN") ?? appBaseUrl);
  const rpName = readEnv(env, "WEBAUTHN_RP_NAME") ?? defaults?.appName ?? "SelahKeep";

  const explicitRpId = readEnv(env, "WEBAUTHN_RP_ID");
  const rpId =
    explicitRpId ??
    hostnameFromUrl(origin) ??
    hostnameFromUrl(appBaseUrl) ??
    "localhost";

  return { origin, rpId, rpName, appBaseUrl };
}

/** Origins accepted when verifying WebAuthn ceremonies (includes localhost aliases). */
export function resolveWebAuthnOrigins(
  env: NodeJS.ProcessEnv = process.env,
  defaults?: { baseUrl?: string }
): string[] {
  const { origin, appBaseUrl } = resolveWebAuthnSettings(env, defaults);
  const configured = [
    origin,
    appBaseUrl,
    readEnv(env, "WEBAUTHN_ORIGIN"),
    readEnvWithLegacy(env, "APP_BASE_URL", "NEXTAUTH_URL"),
    readEnv(env, "NEXTAUTH_URL"),
    defaults?.baseUrl ?? "http://localhost:3001",
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeOrigin);

  const origins = new Set<string>(configured);

  for (const candidate of configured) {
    try {
      const url = new URL(candidate);
      if (url.hostname === "localhost") {
        origins.add(normalizeOrigin(candidate.replace("localhost", "127.0.0.1")));
      }
      if (url.hostname === "127.0.0.1") {
        origins.add(normalizeOrigin(candidate.replace("127.0.0.1", "localhost")));
      }
    } catch {
      // Ignore invalid URL entries in env.
    }
  }

  return [...origins];
}

/** True when explicit RP ID hostname does not match the configured app origin hostname. */
export function webAuthnRpIdMismatchesAppOrigin(env: NodeJS.ProcessEnv = process.env): boolean {
  const explicitRpId = readEnv(env, "WEBAUTHN_RP_ID");
  if (!explicitRpId) return false;

  const appBaseUrl = normalizeOrigin(
    readEnvWithLegacy(env, "APP_BASE_URL", "NEXTAUTH_URL") ?? ""
  );
  const origin = normalizeOrigin(readEnv(env, "WEBAUTHN_ORIGIN") ?? appBaseUrl);
  const appHost = hostnameFromUrl(origin) ?? hostnameFromUrl(appBaseUrl);
  if (!appHost) return false;

  return explicitRpId !== appHost && !appHost.endsWith(`.${explicitRpId}`);
}
