import { readEnv } from "@/lib/env/parse";

export type RateLimitStore = "memory" | "postgres";

/** Resolves auth/product rate-limit backend. Production defaults to postgres (secure-auth 0.5.0+). */
export function resolveRateLimitStore(env: NodeJS.ProcessEnv = process.env): RateLimitStore {
  const explicit =
    readEnv(env, "AUTH_RATE_LIMIT_STORE") ?? readEnv(env, "RATE_LIMIT_STORE");
  if (explicit === "postgres" || explicit === "memory") {
    return explicit;
  }
  return env.NODE_ENV === "production" ? "postgres" : "memory";
}
