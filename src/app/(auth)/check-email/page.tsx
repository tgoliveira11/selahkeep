"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CHECK_EMAIL_MESSAGE } from "@/lib/account-auth-messages";
import { accountAuthApi } from "@/lib/api-client/account-auth";

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    if (!email) {
      setError("Enter your email on the sign-in page to request a new verification link.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await accountAuthApi.resendVerification({ email });
      setMessage(result.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resend verification email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageLayout width="narrow">
      <PageHeader title="Check your email" description={CHECK_EMAIL_MESSAGE} />
      <Card className="space-y-4">
        {email && (
          <p className="text-sm text-[var(--muted)]">
            We sent a link to <span className="text-[var(--foreground)]">{email}</span>.
          </p>
        )}
        <Button variant="secondary" onClick={() => void handleResend()} disabled={loading || !email}>
          {loading ? "Sending…" : "Resend verification email"}
        </Button>
        {message && <Alert variant="muted">{message}</Alert>}
        {error && (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        )}
        <p className="text-sm text-[var(--muted)]">
          Already verified?{" "}
          <Link href="/login" className="font-medium text-[var(--primary)] hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </PageLayout>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense
      fallback={
        <PageLayout width="narrow">
          <p className="text-sm text-[var(--muted)]">Loading…</p>
        </PageLayout>
      }
    >
      <CheckEmailContent />
    </Suspense>
  );
}
