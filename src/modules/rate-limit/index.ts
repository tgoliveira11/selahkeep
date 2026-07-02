import "server-only";
import type {
  RateLimitAdapter,
  RateLimitOperation,
  RateLimitResult,
  RateLimitScope,
} from "./core/types";
import { RATE_LIMIT_POLICIES } from "./core/types";
import { InMemoryRateLimitAdapter } from "./adapters/in-memory-adapter";
import { PostgresRateLimitAdapter } from "./adapters/postgres-adapter";
import { resolveRateLimitStore } from "@/lib/env/rate-limit-store";

let adapter: RateLimitAdapter | null = null;

function resolveAdapter(): RateLimitAdapter {
  if (adapter) return adapter;

  const store = resolveRateLimitStore(process.env);
  if (process.env.NODE_ENV === "production" && store !== "postgres") {
    throw new Error("RATE_LIMIT_STORE=postgres is required in production");
  }

  if (store === "postgres") {
    adapter = new PostgresRateLimitAdapter();
  } else {
    adapter = new InMemoryRateLimitAdapter();
  }
  return adapter;
}

/** Override adapter in tests. */
export function setRateLimitAdapterForTests(next: RateLimitAdapter | null): void {
  adapter = next;
}

export async function checkRateLimit(scope: RateLimitScope): Promise<RateLimitResult> {
  const policy = RATE_LIMIT_POLICIES[scope.operation];
  return resolveAdapter().check(scope, policy.maxAttempts, policy.windowMs);
}

export async function resetRateLimit(scope: RateLimitScope): Promise<void> {
  await resolveAdapter().reset(scope);
}

export async function enforceRateLimit(scope: RateLimitScope): Promise<void> {
  const result = await checkRateLimit(scope);
  if (!result.allowed) {
    throw new RateLimitError("Too many requests. Please try again later.");
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

export { buildRateLimitKey, RATE_LIMIT_POLICIES } from "./core/types";
export type {
  RateLimitOperation,
  RateLimitScope,
  RateLimitResult,
  RateLimitAdapter,
} from "./core/types";
