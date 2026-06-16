import { createHash, randomBytes } from "node:crypto";

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token: string): string {
  const pepper = process.env.NEXTAUTH_SECRET;
  if (!pepper) {
    throw new Error("NEXTAUTH_SECRET is not configured");
  }
  return createHash("sha256").update(`${pepper}:${token}`).digest("hex");
}
