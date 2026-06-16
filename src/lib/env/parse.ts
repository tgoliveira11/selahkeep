export function readEnv(
  env: NodeJS.ProcessEnv,
  key: string
): string | undefined {
  const value = env[key];
  if (value === undefined || value.trim() === "") return undefined;
  return value;
}

export function readRequiredEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = readEnv(env, key);
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

/** Only `"true"` / `"false"` are valid; anything else throws at startup. */
export function readBoolEnv(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: boolean
): boolean {
  const raw = readEnv(env, key);
  if (raw === undefined) return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`${key} must be "true" or "false" (got ${JSON.stringify(raw)})`);
}

export function readIntEnv(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
  options?: { min?: number; max?: number }
): number {
  const raw = readEnv(env, key);
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return fallback;
  const min = options?.min ?? Number.MIN_SAFE_INTEGER;
  const max = options?.max ?? Number.MAX_SAFE_INTEGER;
  return Math.min(max, Math.max(min, parsed));
}

export function readEnumEnv<T extends string>(
  env: NodeJS.ProcessEnv,
  key: string,
  allowed: readonly T[],
  fallback: T
): T {
  const raw = readEnv(env, key);
  if (!raw) return fallback;
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

/** Prefer `primaryKey`, then `legacyKey`. */
export function readEnvWithLegacy(
  env: NodeJS.ProcessEnv,
  primaryKey: string,
  legacyKey: string
): string | undefined {
  return readEnv(env, primaryKey) ?? readEnv(env, legacyKey);
}
