"use client";

import { FormEvent, useState } from "react";
import { getSession, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  authLoginApi,
  readNamedFormField,
} from "@tgoliveira/secure-auth/client";
import { Button, FormField, Input } from "@tgoliveira/secure-auth/react";
import { isFullyAuthenticatedSession } from "@/lib/auth/session-state";

const OAUTH_TWO_FACTOR_ERROR = "That code did not work. Try again or use a backup code.";
const SESSION_REFRESH_MS = 5_000;
const SESSION_POLL_INTERVAL_MS = 100;

function normalizeTotpCode(raw: string): string {
  return raw.replace(/\s+/g, "").trim();
}

async function waitForFullyAuthenticatedSession(
  maxMs = SESSION_REFRESH_MS
): Promise<boolean> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const session = await getSession();
    if (isFullyAuthenticatedSession(session)) return true;
    await new Promise((resolve) => setTimeout(resolve, SESSION_POLL_INTERVAL_MS));
  }
  return false;
}

type OAuthTwoFactorChallengeProps = {
  afterLoginPath: string;
  /** Override session poll timeout (tests only). */
  sessionRefreshTimeoutMs?: number;
};

/** App-side OAuth 2FA challenge — waits for session refresh before redirect (mobile-safe). */
export function OAuthTwoFactorChallenge({
  afterLoginPath,
  sessionRefreshTimeoutMs = SESSION_REFRESH_MS,
}: OAuthTwoFactorChallengeProps) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = event.currentTarget;
    const submittedCode = normalizeTotpCode(readNamedFormField(form, "code"));
    const submittedBackupCode = readNamedFormField(form, "backupCode").trim();

    try {
      if (!session?.user?.id) {
        setError("Authentication required.");
        return;
      }

      const result = await authLoginApi.verifyOAuthTwoFactor({
        code: submittedCode || undefined,
        backupCode: submittedBackupCode || undefined,
      });

      await update({ twoFactorUpgradeToken: result.upgradeToken });

      const refreshed = await waitForFullyAuthenticatedSession(sessionRefreshTimeoutMs);
      if (refreshed) {
        router.replace(afterLoginPath);
      } else {
        window.location.assign(afterLoginPath);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(OAUTH_TWO_FACTOR_ERROR);
      } else {
        setError(OAUTH_TWO_FACTOR_ERROR);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
      <FormField id="login-2fa-code" label="Authenticator code">
        <Input
          id="login-2fa-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
        />
      </FormField>
      <FormField id="login-2fa-backup" label="Backup code (optional)">
        <Input id="login-2fa-backup" name="backupCode" autoComplete="off" />
      </FormField>
      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Verifying..." : "Verify and continue"}
      </Button>
    </form>
  );
}
