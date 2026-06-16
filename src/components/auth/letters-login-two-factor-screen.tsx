"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  AuthPageShell,
  Card,
  CredentialsTwoFactorForm,
  OAuthTwoFactorForm,
  PageHeader,
  resolveAuthPaths,
  useSecureAuthUi,
} from "@tgoliveira/secure-auth/react";
import { LettersAuthChrome } from "@/components/auth/letters-auth-chrome";

const CREDENTIALS_TWO_FACTOR_FORM_ACTION = "/api/auth/login/verify-2fa-form";

function LettersLoginTwoFactorContent({
  afterLoginPath = "/letters",
}: {
  afterLoginPath?: string;
}) {
  const searchParams = useSearchParams();
  const ui = useSecureAuthUi();
  const paths = resolveAuthPaths(ui?.paths);
  const mode = searchParams.get("mode") === "credentials" ? "credentials" : "oauth";
  const errorCode = searchParams.get("error") ?? undefined;
  const title = ui?.messages.loginTwoFactorTitle ?? "Two-factor authentication";
  const description =
    ui?.messages.loginTwoFactorDescription ??
    "Enter the 6-digit code from your authenticator app to finish signing in.";

  return (
    <AuthPageShell width="narrow">
      <LettersAuthChrome />
      <PageHeader title={title} description={description} />
      <Card className="space-y-4">
        <Alert variant="info">
          This code protects your account sign-in only. It does not unlock your private letters
          vault or replace your recovery code.
        </Alert>
        {mode === "credentials" ? (
          <CredentialsTwoFactorForm
            errorCode={errorCode}
            formAction={CREDENTIALS_TWO_FACTOR_FORM_ACTION}
            loginPath={paths.login}
          />
        ) : (
          <OAuthTwoFactorForm afterLoginPath={afterLoginPath} />
        )}
      </Card>
    </AuthPageShell>
  );
}

export function LettersLoginTwoFactorScreen({
  afterLoginPath = "/letters",
}: {
  afterLoginPath?: string;
}) {
  return (
    <Suspense fallback={null}>
      <LettersLoginTwoFactorContent afterLoginPath={afterLoginPath} />
    </Suspense>
  );
}
