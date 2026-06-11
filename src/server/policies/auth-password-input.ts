/**
 * Credentials passwords may appear transiently in HTTPS POST/DELETE JSON bodies only.
 * They must never be stored, logged, echoed in responses, or sent in URLs/query strings.
 * Verification uses bcrypt on the server against `users.password_hash` — not client-side checks.
 */

const PASSWORD_QUERY_KEY = /password/i;

export class AuthPasswordTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthPasswordTransportError";
  }
}

export function assertPasswordNotInUrl(requestUrl: string): void {
  const url = new URL(requestUrl);
  for (const key of url.searchParams.keys()) {
    if (PASSWORD_QUERY_KEY.test(key)) {
      throw new AuthPasswordTransportError("Passwords must not be sent in URLs or query strings");
    }
  }
}

export function assertAuthPasswordRequestMethod(method: string, allowed: ReadonlySet<string>): void {
  if (!allowed.has(method.toUpperCase())) {
    throw new AuthPasswordTransportError("Passwords are only accepted in approved auth request methods");
  }
}

/** Remove password fields before serializing API responses. */
export function stripPasswordFields<T extends Record<string, unknown>>(payload: T): Omit<T, "password" | "passwordHash" | "password_hash"> {
  const { password: _password, passwordHash: _hash, password_hash: _legacy, ...rest } = payload;
  return rest;
}
