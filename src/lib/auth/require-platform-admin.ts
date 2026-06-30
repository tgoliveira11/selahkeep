import "server-only";

import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { users } from "@tgoliveira/secure-auth/drizzle/schema";
import { secureAuthDb } from "@/lib/secure-auth-db";
import { readAdminBootstrapEmail } from "@/lib/secure-auth-admin-bootstrap";

/** @deprecated Prefer ADMIN_BOOTSTRAP_EMAIL env via readAdminBootstrapEmail(). */
export const PLATFORM_ADMIN_EMAIL = "tgoliveira11@gmail.com";

export class AdminForbiddenError extends Error {
  constructor(message = "Admin access required") {
    super(message);
    this.name = "AdminForbiddenError";
  }
}

export function isPlatformAdminUser(
  user: { email: string; role: string },
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (user.role === "admin") return true;
  const bootstrapEmail = readAdminBootstrapEmail(env);
  if (bootstrapEmail) {
    return user.email.trim().toLowerCase() === bootstrapEmail;
  }
  return user.email.trim().toLowerCase() === PLATFORM_ADMIN_EMAIL;
}

export async function requirePlatformAdmin(request: Request): Promise<{ actor: string }> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new AdminForbiddenError("Authentication is not configured");
  }

  const token = await getToken({
    req: new NextRequest(request.url, { headers: request.headers }),
    secret,
  });
  if (!token?.sub || typeof token.sub !== "string") {
    throw new AdminForbiddenError("Authentication required");
  }

  const rows = await secureAuthDb
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, token.sub))
    .limit(1);

  const user = rows[0];
  if (!user || !isPlatformAdminUser(user, process.env)) {
    throw new AdminForbiddenError("Admin access required");
  }

  return { actor: user.id };
}
