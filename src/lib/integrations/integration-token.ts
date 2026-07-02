import { createHash, randomBytes } from "node:crypto";

function bytesToBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

export function hashIntegrationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateIntegrationToken(): {
  token: string;
  tokenHash: string;
  tokenPrefix: string;
} {
  const raw = randomBytes(32);
  const token = `sk_int_${bytesToBase64Url(raw)}`;
  return {
    token,
    tokenHash: hashIntegrationToken(token),
    tokenPrefix: token.slice(0, 12),
  };
}

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}
