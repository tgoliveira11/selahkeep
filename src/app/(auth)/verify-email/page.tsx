"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";
import { accountAuthApi } from "@/lib/api-client/account-auth";

type VerifyState = "loading" | "success" | "invalid";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<VerifyState>("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }

    let cancelled = false;
    accountAuthApi
      .confirmVerification(token)
      .then((result) => {
        if (cancelled) return;
        setEmail(result.email);
        setState("success");
      })
      .catch(() => {
        if (!cancelled) setState("invalid");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state === "loading") {
    return (
      <PageLayout width="narrow">
        <LoadingState label="Verifying your email" />
      </PageLayout>
    );
  }

  return (
    <PageLayout width="narrow">
      <PageHeader
        title={state === "success" ? "Your email has been verified" : "Verification link expired"}
        description={
          state === "success"
            ? "You can now sign in and use your account."
            : "This verification link is invalid or expired. You can request a new one."
        }
      />
      <Card className="space-y-4">
        {state === "success" && email && <Alert variant="success">Verified {email}</Alert>}
        <Link href="/login" className="block">
          <Button className="w-full">Continue to sign in</Button>
        </Link>
        {state === "invalid" && (
          <Link href="/check-email" className="block">
            <Button variant="secondary" className="w-full">
              Request a new link
            </Button>
          </Link>
        )}
      </Card>
    </PageLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <PageLayout width="narrow">
          <LoadingState label="Verifying your email" />
        </PageLayout>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
