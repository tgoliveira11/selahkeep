import { createHash } from "node:crypto";

/** Scoped rate-limit identifier — never store or log the raw email. */
export function hashEmailForScope(email: string): string {
  const pepper = process.env.NEXTAUTH_SECRET;
  if (!pepper) {
    throw new Error("NEXTAUTH_SECRET is not configured");
  }
  const normalized = email.trim().toLowerCase();
  return createHash("sha256").update(`${pepper}:email-scope:${normalized}`).digest("hex");
}
