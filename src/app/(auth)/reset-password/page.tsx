"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { PasswordStrengthField } from "@/components/auth/password-strength-field";
import {
  ACCOUNT_PASSWORD_RESET_VAULT_NOTE,
  ACCOUNT_PASSWORD_VAULT_NOTE,
} from "@/lib/account-auth-messages";
import { accountAuthApi } from "@/lib/api-client/account-auth";
import { assessPassword } from "@/lib/password-policy";

type ResetState = "loading" | "invalid" | "ready" | "success";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<ResetState>("loading");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    let cancelled = false;
    accountAuthApi
      .validateResetToken(token)
      .then((result) => {
        if (!cancelled) setState(result.valid ? "ready" : "invalid");
      })
      .catch(() => {
        if (!cancelled) setState("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const assessment = assessPassword(newPassword);
    if (!assessment.meetsPolicy && assessment.label === "too_short") {
      setError(assessment.messages[0] ?? "Password is too short.");
      return;
    }

    setLoading(true);
    try {
      await accountAuthApi.resetPassword(token, newPassword);
      setState("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reset password.");
    } finally {
      setLoading(false);
    }
  }

  if (state === "loading") {
    return (
      <PageLayout width="narrow">
        <LoadingState label="Checking reset link" />
      </PageLayout>
    );
  }

  if (state === "invalid") {
    return (
      <PageLayout width="narrow">
        <PageHeader
          title="Reset link expired"
          description="This reset link is invalid or expired. You can request a new one."
        />
        <Card>
          <Link href="/forgot-password" className="block">
            <Button className="w-full">Request a new reset link</Button>
          </Link>
        </Card>
      </PageLayout>
    );
  }

  if (state === "success") {
    return (
      <PageLayout width="narrow">
        <PageHeader
          title="Password updated"
          description="Your password has been updated. You can now sign in with your new password."
        />
        <Card className="space-y-4">
          <Alert variant="muted">{ACCOUNT_PASSWORD_RESET_VAULT_NOTE}</Alert>
          <Button className="w-full" onClick={() => router.push("/login")}>
            Continue to sign in
          </Button>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout width="narrow">
      <PageHeader title="Choose a new password" description={ACCOUNT_PASSWORD_VAULT_NOTE} />
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordStrengthField
            id="reset-new-password"
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            confirmValue={confirmPassword}
          />
          <PasswordStrengthField
            id="reset-confirm-password"
            label="Confirm new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            confirmValue={newPassword}
            showStrength={false}
          />
          {error && (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Updating…" : "Update password"}
          </Button>
        </form>
      </Card>
    </PageLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <PageLayout width="narrow">
          <LoadingState label="Checking reset link" />
        </PageLayout>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
