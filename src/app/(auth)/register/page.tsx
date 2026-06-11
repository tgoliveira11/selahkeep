"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { PrivacyNotice } from "@/components/ui/privacy-notice";
import { PageHeader } from "@/components/ui/page-header";
import { SocialSignIn } from "@/components/auth/social-sign-in";
import { getErrorMessage } from "@/lib/api-client/parse-response";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      setError(await getErrorMessage(res, "Registration failed"));
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Account created but sign-in failed");
    } else {
      router.push("/letters");
    }
  }

  return (
    <PageLayout width="narrow">
      <PageHeader
        title="Create your account"
        description="Start writing private letters protected on your device."
      />

      <Card className="space-y-6">
        <PrivacyNotice compact />

        <form onSubmit={handleRegister} className="space-y-4">
          <FormField id="register-email" label="Email">
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FormField>
          <FormField id="register-password" label="Password" hint="At least 8 characters">
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </FormField>
          {error && (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating account…" : "Create account with email"}
          </Button>
        </form>

        <SocialSignIn dividerLabel="or sign up with" />

        <p className="text-center text-xs text-[var(--muted)]">
          Google and Apple create your account automatically on first sign-in — the same providers
          available on the sign-in page.
        </p>
      </Card>

      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-[var(--primary)] hover:underline">
          Sign in
        </Link>
      </p>
    </PageLayout>
  );
}
