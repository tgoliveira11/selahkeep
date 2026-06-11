export type RateLimitOperation =
  | "auth.register"
  | "auth.login"
  | "two_factor.setup_verify"
  | "two_factor.disable"
  | "two_factor.login_verify"
  | "two_factor.backup_regenerate"
  | "recovery.attempt"
  | "passkey.register"
  | "passkey.authenticate"
  | "vault.unlock"
  | "trusted_device.create"
  | "account.delete";

export interface RateLimitScope {
  operation: RateLimitOperation;
  userId?: string;
  ip?: string;
  endpoint?: string;
  /** How the bucket key is scoped — defaults to composite email+IP when both are present. */
  keyMode?: RateLimitKeyMode;
}

export type RateLimitKeyMode = "email" | "ip" | "email_ip";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

export interface RateLimitAdapter {
  check(scope: RateLimitScope, maxAttempts: number, windowMs: number): Promise<RateLimitResult>;
  reset(scope: RateLimitScope): Promise<void>;
}

export interface RateLimitPolicy {
  maxAttempts: number;
  windowMs: number;
}

export const RATE_LIMIT_POLICIES: Record<RateLimitOperation, RateLimitPolicy> = {
  "auth.register": { maxAttempts: 10, windowMs: 60 * 60 * 1000 },
  "auth.login": { maxAttempts: 20, windowMs: 15 * 60 * 1000 },
  "two_factor.setup_verify": { maxAttempts: 10, windowMs: 15 * 60 * 1000 },
  "two_factor.disable": { maxAttempts: 10, windowMs: 15 * 60 * 1000 },
  "two_factor.login_verify": { maxAttempts: 10, windowMs: 15 * 60 * 1000 },
  "two_factor.backup_regenerate": { maxAttempts: 3, windowMs: 60 * 60 * 1000 },
  "recovery.attempt": { maxAttempts: 5, windowMs: 15 * 60 * 1000 },
  "passkey.register": { maxAttempts: 10, windowMs: 60 * 60 * 1000 },
  "passkey.authenticate": { maxAttempts: 20, windowMs: 15 * 60 * 1000 },
  "vault.unlock": { maxAttempts: 10, windowMs: 15 * 60 * 1000 },
  "trusted_device.create": { maxAttempts: 10, windowMs: 60 * 60 * 1000 },
  "account.delete": { maxAttempts: 3, windowMs: 60 * 60 * 1000 },
};

/** Builds a scoped bucket key — never use operation-only keys that could lock out all users. */
export function buildRateLimitKey(scope: RateLimitScope): string {
  const endpointPart = scope.endpoint ?? "default";
  const emailPart = scope.userId ?? "anonymous";
  const ipPart = scope.ip ?? "unknown-ip";
  const mode: RateLimitKeyMode =
    scope.keyMode ??
    (scope.userId && scope.ip ? "email_ip" : scope.ip ? "ip" : "email");

  switch (mode) {
    case "email":
      return `rate:${scope.operation}:email:${emailPart}:endpoint:${endpointPart}`;
    case "ip":
      return `rate:${scope.operation}:ip:${ipPart}:endpoint:${endpointPart}`;
    case "email_ip":
      return `rate:${scope.operation}:email:${emailPart}:ip:${ipPart}:endpoint:${endpointPart}`;
  }
}
