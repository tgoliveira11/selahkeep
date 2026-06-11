"use client";

import { useEffect, useState } from "react";
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
import {
  getPasskeyLoginUnsupportedMessage,
  isPasskeyLoginSupported,
  signInWithPasskey,
} from "@/features/passkey/sign-in-with-passkey";
import { getPasskeyLoginHint } from "@/lib/passkey/login-hint";
import {
  PASSKEY_LOGIN_CANCELLED_MESSAGE,
  PASSKEY_LOGIN_UNSUPPORTED_MESSAGE,
} from "@/lib/passkey/messages";

const CHALLENGE_STORAGE_KEY = "letters-2fa-login-challenge";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeySupportChecked, setPasskeySupportChecked] = useState(false);

  useEffect(() => {
    setPasskeySupported(isPasskeyLoginSupported());
    setPasskeySupportChecked(true);
  }, []);

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

  async function handlePasskeySignIn() {
    if (!passkeySupported) {
      setError(PASSKEY_LOGIN_UNSUPPORTED_MESSAGE);
      return;
    }

    setPasskeyLoading(true);
    setError("");

    try {
      const trimmedEmail = email.trim();
      const hint = getPasskeyLoginHint();
      if (!trimmedEmail && !hint?.credentialId && !hint?.userId) {
        setError("Enter your email above to sign in with your passkey.");
        return;
      }

      const result = await signInWithPasskey(
        trimmedEmail ? { email: trimmedEmail } : undefined
      );
      if (result.outcome === "cancelled") {
        setError(PASSKEY_LOGIN_CANCELLED_MESSAGE);
        return;
      }
      if (result.outcome === "unsupported") {
        setError(getPasskeyLoginUnsupportedMessage());
        return;
      }
      router.push(result.redirectTo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Passkey sign-in failed");
    } finally {
      setPasskeyLoading(false);
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

        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-[var(--border)]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wide">
            <span className="bg-[var(--card)] px-2 text-[var(--muted)]">or</span>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={passkeyLoading || loading || !passkeySupported}
          onClick={() => void handlePasskeySignIn()}
        >
          {passkeyLoading ? "Signing in…" : "Sign in with passkey"}
        </Button>
        {passkeySupportChecked && !passkeySupported && (
          <p className="text-sm text-[var(--muted)]">{PASSKEY_LOGIN_UNSUPPORTED_MESSAGE}</p>
        )}

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
