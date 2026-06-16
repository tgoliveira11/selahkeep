import { randomUUID } from "node:crypto";

/** Fresh nonce per request for Next.js inline scripts (production App Router). */
export function createContentSecurityPolicyNonce(): string {
  return Buffer.from(randomUUID()).toString("base64");
}

export function buildContentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";

  const directives = [
    "default-src 'self'",
    isDev
      ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    isDev ? "style-src 'self' 'unsafe-inline'" : `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    isDev ? "connect-src 'self' ws:" : "connect-src 'self'",
    "img-src 'self' data:",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  if (!isDev) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function applyContentSecurityPolicy(
  requestHeaders: Headers,
  response: Response,
  nonce: string
): void {
  const policy = buildContentSecurityPolicy(nonce);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  response.headers.set("Content-Security-Policy", policy);
}
