import { createHash } from "node:crypto";

/** Mask IPv4/IPv6 for display — never show full IP in session UI. */
export function maskIp(ip: string): string {
  const trimmed = ip.trim();
  if (!trimmed || trimmed === "unknown-ip") {
    return "partially hidden";
  }

  if (trimmed.includes(".")) {
    const parts = trimmed.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
  }

  if (trimmed.includes(":")) {
    const segments = trimmed.split(":").filter(Boolean);
    if (segments.length >= 2) {
      return `${segments.slice(0, 2).join(":")}:xxx`;
    }
  }

  return "partially hidden";
}

/** Hashed IP for audit/security — not reversible. */
export function hashIp(ip: string): string {
  const pepper = process.env.NEXTAUTH_SECRET;
  if (!pepper) {
    throw new Error("NEXTAUTH_SECRET is not configured");
  }
  const normalized = ip.trim().toLowerCase();
  return createHash("sha256").update(`${pepper}:ip:${normalized}`).digest("hex");
}
