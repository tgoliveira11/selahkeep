#!/usr/bin/env node
/**
 * Phase 1 modular monolith: move files into src/modules and create re-export shims.
 * Run from repo root: node scripts/phase1-move-modules.mjs
 */
import { mkdirSync, writeFileSync, existsSync, renameSync } from "fs";
import { dirname, join } from "path";

const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

/** @type {Array<[string, string]>} */
const moves = [
  // security
  ["src/lib/logger.ts", "src/modules/security/logger.ts"],
  ["src/lib/load-env.ts", "src/modules/security/load-env.ts"],
  ["src/lib/password-policy.ts", "src/modules/security/password-policy.ts"],
  ["src/lib/request-ip.ts", "src/modules/security/request-ip.ts"],
  ["src/server/policies/password-hashing.ts", "src/modules/security/policies/password-hashing.ts"],
  ["src/server/policies/login-token.ts", "src/modules/security/policies/login-token.ts"],
  ["src/server/policies/auth-password-input.ts", "src/modules/security/policies/auth-password-input.ts"],
  ["src/server/policies/plaintext-rejection.ts", "src/modules/security/policies/plaintext-rejection.ts"],
  ["src/server/policies/aad-validation.ts", "src/modules/security/policies/aad-validation.ts"],
  // email
  ["src/server/email/send-email.ts", "src/modules/email/send-email.ts"],
  ["src/server/email/smtp-provider.ts", "src/modules/email/smtp-provider.ts"],
  ["src/server/email/config.ts", "src/modules/email/config.ts"],
  ["src/server/email/account-email-templates.ts", "src/modules/email/account-email-templates.ts"],
  ["src/server/policies/email-scope.ts", "src/modules/email/email-scope.ts"],
  // audit
  ["src/server/repositories/audit-repository.ts", "src/modules/audit/repositories/audit-repository.ts"],
  ["src/server/policies/audit-sanitization.ts", "src/modules/audit/policies/audit-sanitization.ts"],
  // rate-limit
  ["src/server/policies/rate-limit/index.ts", "src/modules/rate-limit/index.ts"],
  ["src/server/policies/rate-limit/types.ts", "src/modules/rate-limit/types.ts"],
  ["src/server/policies/rate-limit/in-memory-adapter.ts", "src/modules/rate-limit/in-memory-adapter.ts"],
  ["src/server/policies/rate-limit/postgres-adapter.ts", "src/modules/rate-limit/postgres-adapter.ts"],
  // auth services
  ["src/server/services/auth-service.ts", "src/modules/auth/services/auth-service.ts"],
  ["src/server/services/auth-login-service.ts", "src/modules/auth/services/auth-login-service.ts"],
  ["src/lib/auth/auth-options.ts", "src/modules/auth/lib/auth-options.ts"],
  ["src/lib/auth/session.ts", "src/modules/auth/lib/session.ts"],
  ["src/lib/auth/sign-out-client.ts", "src/modules/auth/lib/sign-out-client.ts"],
  ["src/lib/auth/login-request-context.ts", "src/modules/auth/lib/login-request-context.ts"],
  ["src/lib/session-config.ts", "src/modules/sessions/lib/session-config.ts"],
  // account
  ["src/server/services/account-service.ts", "src/modules/account/services/account-service.ts"],
  ["src/server/services/account-auth-service.ts", "src/modules/account/services/account-auth-service.ts"],
  ["src/server/repositories/user-repository.ts", "src/modules/account/repositories/user-repository.ts"],
  ["src/server/repositories/account-token-repository.ts", "src/modules/account/repositories/account-token-repository.ts"],
  ["src/lib/account-auth-messages.ts", "src/modules/account/lib/account-auth-messages.ts"],
  ["src/lib/account-deletion.ts", "src/modules/account/lib/account-deletion.ts"],
  // sessions
  ["src/server/services/account-session-service.ts", "src/modules/sessions/services/account-session-service.ts"],
  ["src/server/repositories/account-session-repository.ts", "src/modules/sessions/repositories/account-session-repository.ts"],
  ["src/lib/account-session-types.ts", "src/modules/sessions/lib/account-session-types.ts"],
  ["src/lib/session-ip.ts", "src/modules/sessions/lib/session-ip.ts"],
  ["src/lib/device-display-info.ts", "src/modules/sessions/lib/device-display-info.ts"],
  ["src/lib/user-agent-metadata.ts", "src/modules/sessions/lib/user-agent-metadata.ts"],
  ["src/lib/ui/format-session-datetime.ts", "src/modules/sessions/lib/format-session-datetime.ts"],
  ["src/lib/ui/format-auth-method.ts", "src/modules/sessions/lib/format-auth-method.ts"],
  ["src/lib/ui/format-auth-provider.ts", "src/modules/sessions/lib/format-auth-provider.ts"],
  // two-factor
  ["src/server/services/two-factor-service.ts", "src/modules/two-factor/services/two-factor-service.ts"],
  ["src/server/repositories/two-factor-repository.ts", "src/modules/two-factor/repositories/two-factor-repository.ts"],
  ["src/server/policies/totp.ts", "src/modules/two-factor/policies/totp.ts"],
  ["src/server/policies/totp-login.ts", "src/modules/two-factor/policies/totp-login.ts"],
  ["src/server/policies/two-factor-secret-crypto.ts", "src/modules/two-factor/policies/two-factor-secret-crypto.ts"],
  ["src/server/policies/backup-code.ts", "src/modules/two-factor/policies/backup-code.ts"],
  ["src/lib/two-factor/constants.ts", "src/modules/two-factor/lib/constants.ts"],
  // passkeys
  ["src/server/services/passkey-service.ts", "src/modules/passkeys/services/passkey-service.ts"],
  ["src/server/services/passkey-account-service.ts", "src/modules/passkeys/services/passkey-account-service.ts"],
  ["src/server/services/passkey-login-service.ts", "src/modules/passkeys/services/passkey-login-service.ts"],
  ["src/server/repositories/passkey-repository.ts", "src/modules/passkeys/repositories/passkey-repository.ts"],
  ["src/lib/passkey/credential-label.ts", "src/modules/passkeys/lib/credential-label.ts"],
  ["src/lib/passkey/login-hint.ts", "src/modules/passkeys/lib/login-hint.ts"],
  ["src/lib/passkey/messages.ts", "src/modules/passkeys/lib/messages.ts"],
  ["src/lib/passkey/prepare-webauthn-options.ts", "src/modules/passkeys/lib/prepare-webauthn-options.ts"],
  ["src/lib/passkey/prf-support.ts", "src/modules/passkeys/lib/prf-support.ts"],
  ["src/lib/passkey/prf.ts", "src/modules/passkeys/lib/prf.ts"],
  ["src/lib/passkey/webauthn-config.ts", "src/modules/passkeys/lib/webauthn-config.ts"],
  // vault
  ["src/server/services/vault-service.ts", "src/modules/vault/services/vault-service.ts"],
  ["src/server/services/trusted-device-service.ts", "src/modules/vault/services/trusted-device-service.ts"],
  ["src/server/repositories/vault-repository.ts", "src/modules/vault/repositories/vault-repository.ts"],
  ["src/server/repositories/trusted-device-repository.ts", "src/modules/vault/repositories/trusted-device-repository.ts"],
  ["src/lib/trusted-device-utils.ts", "src/modules/vault/lib/trusted-device-utils.ts"],
  ["src/lib/ui/recovery-state-labels.ts", "src/modules/vault/lib/recovery-state-labels.ts"],
  // letters
  ["src/server/services/letter-service.ts", "src/modules/letters/services/letter-service.ts"],
  ["src/server/repositories/letter-repository.ts", "src/modules/letters/repositories/letter-repository.ts"],
];

function shimContent(toPath) {
  const moduleImport = `@/${toPath.replace(/^src\//, "").replace(/\.tsx?$/, "")}`;
  return `/** @deprecated Import from "${moduleImport}" — Phase 1 modular monolith shim */\nexport * from "${moduleImport}";\n`;
}

for (const [from, to] of moves) {
  const fromAbs = join(root, from);
  const toAbs = join(root, to);
  if (!existsSync(fromAbs)) {
    console.warn(`skip missing: ${from}`);
    continue;
  }
  if (existsSync(toAbs)) {
    console.warn(`skip exists: ${to}`);
    continue;
  }
  mkdirSync(dirname(toAbs), { recursive: true });
  renameSync(fromAbs, toAbs);
  writeFileSync(fromAbs, shimContent(to));
  console.log(`moved ${from} -> ${to}`);
}

console.log("done");
