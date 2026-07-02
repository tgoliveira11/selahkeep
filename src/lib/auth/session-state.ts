import type { Session } from "next-auth";

/** Minimal session shape for auth-state checks (client + server). */
export type SessionLike =
  | Pick<Session, "twoFactorPending" | "twoFactorVerified"> & {
      user?: { id?: string | null } | null;
    }
  | null
  | undefined;

/** True when the user has a session but still owes a 2FA challenge. */
export function isPendingTwoFactorSession(session: SessionLike): boolean {
  if (!session?.user?.id) return false;
  return session.twoFactorPending === true || session.twoFactorVerified === false;
}

/** True only when the account session is complete (2FA satisfied when required). */
export function isFullyAuthenticatedSession(session: SessionLike): boolean {
  if (!session?.user?.id) return false;
  if (session.twoFactorPending === true) return false;
  if (session.twoFactorVerified === false) return false;
  if (
    "emailVerificationRequired" in session &&
    (session as { emailVerificationRequired?: boolean }).emailVerificationRequired === true
  ) {
    return false;
  }
  return true;
}
