#!/usr/bin/env node
/**
 * Phase 2: reorganize pure utilities into core subfolders with shims at prior paths.
 * Run from repo root: node scripts/phase2-extract-utilities.mjs
 */
import { mkdirSync, writeFileSync, existsSync, renameSync } from "fs";
import { dirname, join } from "path";

const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

/** @type {Array<[string, string]>} */
const moves = [
  // security — pure utilities
  ["src/modules/security/logger.ts", "src/modules/security/logger/index.ts"],
  ["src/modules/security/load-env.ts", "src/modules/security/env/load-env.ts"],
  ["src/modules/security/password-policy.ts", "src/modules/security/password-policy/index.ts"],
  ["src/modules/security/request-ip.ts", "src/modules/security/ip/request-ip.ts"],
  ["src/modules/sessions/lib/session-ip.ts", "src/modules/security/ip/session-ip.ts"],
  ["src/modules/sessions/lib/user-agent-metadata.ts", "src/modules/security/user-agent/metadata.ts"],
  ["src/modules/email/email-scope.ts", "src/modules/security/scopes/email-scope.ts"],

  // email — core vs account templates
  ["src/modules/email/send-email.ts", "src/modules/email/core/send-email.ts"],
  ["src/modules/email/smtp-provider.ts", "src/modules/email/core/smtp-provider.ts"],
  ["src/modules/email/config.ts", "src/modules/email/core/config.ts"],
  ["src/modules/email/account-email-templates.ts", "src/modules/email/templates/account-email-templates.ts"],

  // rate-limit — core vs adapters
  ["src/modules/rate-limit/types.ts", "src/modules/rate-limit/core/types.ts"],
  ["src/modules/rate-limit/in-memory-adapter.ts", "src/modules/rate-limit/adapters/in-memory-adapter.ts"],
  ["src/modules/rate-limit/postgres-adapter.ts", "src/modules/rate-limit/adapters/postgres-adapter.ts"],

  // audit — core sanitization
  ["src/modules/audit/policies/audit-sanitization.ts", "src/modules/audit/core/audit-sanitization.ts"],

  // ui — primitives vs product copy
  ["src/modules/ui/components/alert.tsx", "src/modules/ui/primitives/alert.tsx"],
  ["src/modules/ui/components/app-mark.tsx", "src/modules/ui/primitives/app-mark.tsx"],
  ["src/modules/ui/components/badge.tsx", "src/modules/ui/primitives/badge.tsx"],
  ["src/modules/ui/components/button.tsx", "src/modules/ui/primitives/button.tsx"],
  ["src/modules/ui/components/card.tsx", "src/modules/ui/primitives/card.tsx"],
  ["src/modules/ui/components/confirm-dialog.tsx", "src/modules/ui/primitives/confirm-dialog.tsx"],
  ["src/modules/ui/components/empty-state.tsx", "src/modules/ui/primitives/empty-state.tsx"],
  ["src/modules/ui/components/error-state.tsx", "src/modules/ui/primitives/error-state.tsx"],
  ["src/modules/ui/components/form-field.tsx", "src/modules/ui/primitives/form-field.tsx"],
  ["src/modules/ui/components/input.tsx", "src/modules/ui/primitives/input.tsx"],
  ["src/modules/ui/components/loading-state.tsx", "src/modules/ui/primitives/loading-state.tsx"],
  ["src/modules/ui/components/page-header.tsx", "src/modules/ui/primitives/page-header.tsx"],
  ["src/modules/ui/components/success-state.tsx", "src/modules/ui/primitives/success-state.tsx"],
  ["src/modules/ui/components/textarea.tsx", "src/modules/ui/primitives/textarea.tsx"],
  ["src/modules/ui/components/privacy-notice.tsx", "src/modules/vault/components/privacy-notice.tsx"],
  ["src/modules/ui/components/recovery-notice.tsx", "src/modules/vault/components/recovery-notice.tsx"],
];

function shimContent(toPath) {
  const moduleImport = `@/${toPath.replace(/^src\//, "").replace(/\.tsx?$/, "")}`;
  return `/** @deprecated Import from "${moduleImport}" — Phase 2 utility extraction shim */\nexport * from "${moduleImport}";\n`;
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
