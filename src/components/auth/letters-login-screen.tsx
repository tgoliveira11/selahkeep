"use client";

import Link from "next/link";
import {
  AuthPageShell,
  Card,
  CredentialsLoginForm,
  LoginPasskeySection,
  PageHeader,
  resolveAuthPaths,
  useSecureAuthUi,
} from "@tgoliveira/secure-auth/react";
import { LettersAuthChrome } from "@/components/auth/letters-auth-chrome";

const CREDENTIALS_LOGIN_FORM_ACTION = "/api/auth/login/start-form";

export function LettersLoginScreen({ afterLoginPath = "/letters" }: { afterLoginPath?: string }) {
  const ui = useSecureAuthUi();
  const paths = resolveAuthPaths(ui?.paths);
  const title = ui?.messages.loginTitle ?? "Welcome back";
  const description =
    ui?.messages.loginDescription ?? "Sign in to continue writing your private letters.";
  const registerLinkLabel = ui?.messages.registerLinkLabel ?? "Create one";

  return (
    <AuthPageShell width="narrow">
      <LettersAuthChrome />
      <PageHeader title={title} description={description} />
      <Card className="space-y-6">
        <CredentialsLoginForm
          loginAction={CREDENTIALS_LOGIN_FORM_ACTION}
          forgotPasswordPath={paths.forgotPassword}
        />
        <LoginPasskeySection
          appSlug={ui?.appSlug ?? "letters-to-god"}
          afterLoginPath={afterLoginPath}
          loginPath={paths.login}
        />
      </Card>
      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        No account?{" "}
        <Link href={paths.register} className="font-medium text-[var(--primary)] hover:underline">
          {registerLinkLabel}
        </Link>
      </p>
    </AuthPageShell>
  );
}
