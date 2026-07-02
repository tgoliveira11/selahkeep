import "server-only";

import { enforceRateLimit, RateLimitError } from "@/modules/rate-limit";
import type { RateLimitOperation } from "@/modules/rate-limit";
import { getClientIp } from "@/modules/security/ip/request-ip";

export type ProductMutationOperation = Extract<
  RateLimitOperation,
  "notes.mutate" | "kanban.mutate" | "attachments.mutate"
>;

export async function enforceProductMutationRateLimit(
  request: Request,
  userId: string,
  operation: ProductMutationOperation
): Promise<void> {
  await enforceRateLimit({
    operation,
    userId,
    ip: getClientIp(request),
    endpoint: operation,
    keyMode: "email",
  });
}

export { RateLimitError };
