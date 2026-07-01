import {
  buildVaultRateLimitHttpResponse,
  consumeVaultApiRateLimit,
} from "@tgoliveira/vault-core";
import { getVaultApiRateLimiter } from "@/lib/vault/vault-rate-limit";

export function vaultApiRateLimitResponse(
  namespace: string,
  clientKey: string
): Response | null {
  const decision = consumeVaultApiRateLimit(getVaultApiRateLimiter(), namespace, clientKey);
  if (decision.allowed) return null;
  const limited = buildVaultRateLimitHttpResponse(decision);
  return Response.json(limited.body, {
    status: limited.status,
    headers: limited.headers,
  });
}

export function vaultApiClientKey(request: Request, userId?: string): string {
  return userId ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
}
