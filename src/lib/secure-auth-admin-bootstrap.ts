import "server-only";

import { sql } from "drizzle-orm";
import { users } from "@tgoliveira/secure-auth/drizzle/schema";
import { secureAuthDb } from "@/lib/secure-auth-db";
import { readBoolEnv, readEnv } from "@/lib/env/parse";

export function readAdminBootstrapEmail(env: NodeJS.ProcessEnv = process.env): string | null {
  const email = readEnv(env, "ADMIN_BOOTSTRAP_EMAIL")?.trim().toLowerCase();
  return email || null;
}

/** Ensures ADMIN_BOOTSTRAP_EMAIL always has role=admin (idempotent). */
export async function ensureBootstrapEmailAdminRole(
  env: NodeJS.ProcessEnv = process.env
): Promise<void> {
  const bootstrapEmail = readAdminBootstrapEmail(env);
  if (!bootstrapEmail || !readBoolEnv(env, "AUTH_ADMIN_ENABLED", false)) {
    return;
  }

  await secureAuthDb
    .update(users)
    .set({ role: "admin" })
    .where(sql`lower(${users.email}) = ${bootstrapEmail} and ${users.role} <> 'admin'`);
}
