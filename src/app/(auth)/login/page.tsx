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
import { authLoginApi } from "@/lib/api-client/two-factor";

const CHALLENGE_STORAGE_KEY = "letters-2fa-login-challenge";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const start = await authLoginApi.start({ email, password });
      if (start.requiresTwoFactor) {
        sessionStorage.setItem(CHALLENGE_STORAGE_KEY, start.challengeToken);
        router.push("/login/2fa?mode=credentials");
        return;
      }

      const result = await signIn("login-token", {
        loginToken: start.loginToken,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/letters");
      }
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageLayout width="narrow">
      <PageHeader
        title="Welcome back"
        description="Sign in to continue writing your private letters."
      />

      <Card className="space-y-6">
        <PrivacyNotice compact />

        <form onSubmit={handleCredentials} className="space-y-4">
          <FormField id="login-email" label="Email">
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FormField>
          <FormField id="login-password" label="Password">
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </FormField>
          {error && (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in…" : "Sign in with email"}
          </Button>
        </form>

        <SocialSignIn />
      </Card>

      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        No account?{" "}
        <Link href="/register" className="font-medium text-[var(--primary)] hover:underline">
          Create one
        </Link>
      </p>
    </PageLayout>
  );
}
