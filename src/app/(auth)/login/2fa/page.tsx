"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { authLoginApi } from "@/lib/api-client/two-factor";

const CHALLENGE_STORAGE_KEY = "letters-2fa-login-challenge";

function LoginTwoFactorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, update } = useSession();
  const mode = searchParams.get("mode");
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode !== "credentials") return;
    const challengeToken = sessionStorage.getItem(CHALLENGE_STORAGE_KEY);
    if (!challengeToken) {
      router.replace("/login");
    }
  }, [mode, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "credentials") {
        const challengeToken = sessionStorage.getItem(CHALLENGE_STORAGE_KEY);
        if (!challengeToken) {
          setError("Your sign-in session expired. Please sign in again.");
          setLoading(false);
          return;
        }

        const result = await authLoginApi.verifyTwoFactor({
          challengeToken,
          code: code || undefined,
          backupCode: backupCode || undefined,
        });
        sessionStorage.removeItem(CHALLENGE_STORAGE_KEY);

        const signInResult = await signIn("login-token", {
          loginToken: result.loginToken,
          redirect: false,
        });
        if (signInResult?.error) {
          setError("Could not complete sign-in. Please try again.");
          setLoading(false);
          return;
        }
        router.push("/letters");
        return;
      }

      if (!session?.user?.id) {
        setError("Authentication required.");
        setLoading(false);
        return;
      }

      const result = await authLoginApi.verifyOAuthTwoFactor({
        code: code || undefined,
        backupCode: backupCode || undefined,
      });
      await update({ twoFactorUpgradeToken: result.upgradeToken });
      router.push("/letters");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid authenticator or backup code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageLayout width="narrow">
      <PageHeader
        title="Two-factor authentication"
        description="Enter the 6-digit code from your authenticator app to finish signing in."
      />

      <Card className="space-y-4">
        <Alert variant="info">
          This code protects your account sign-in only. It does not unlock your private letters
          vault or replace your recovery code.
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField id="login-2fa-code" label="Authenticator code">
            <Input
              id="login-2fa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </FormField>
          <FormField id="login-2fa-backup" label="Or backup code">
            <Input
              id="login-2fa-backup"
              autoComplete="off"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value)}
            />
          </FormField>
          {error && (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={loading || (code.length !== 6 && !backupCode.trim())}
          >
            {loading ? "Verifying…" : "Continue"}
          </Button>
        </form>
      </Card>
    </PageLayout>
  );
}

export default function LoginTwoFactorPage() {
  return (
    <Suspense fallback={<PageLayout width="narrow"><p className="text-sm text-[var(--muted)]">Loading…</p></PageLayout>}>
      <LoginTwoFactorForm />
    </Suspense>
  );
}
