"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { accountAuthApi } from "@/lib/api-client/account-auth";

interface EmailVerificationSettingsProps {
  email: string;
  emailVerified: boolean;
  onStatusChange?: () => void;
}

export function EmailVerificationSettings({
  email,
  emailVerified,
  onStatusChange,
}: EmailVerificationSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const result = await accountAuthApi.resendVerification();
      setMessage(result.message);
      onStatusChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resend verification email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-[var(--muted)]">{email}</span>
        <Badge variant={emailVerified ? "success" : "info"}>
          {emailVerified ? "Verified" : "Unverified"}
        </Badge>
      </div>
      {!emailVerified && (
        <>
          <p className="text-sm text-[var(--muted)]">
            Check your email for a verification link, or request a new one.
          </p>
          <Button variant="secondary" onClick={() => void handleResend()} disabled={loading}>
            {loading ? "Sending…" : "Resend verification email"}
          </Button>
        </>
      )}
      {message && (
        <Alert variant="muted">{message}</Alert>
      )}
      {error && (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
