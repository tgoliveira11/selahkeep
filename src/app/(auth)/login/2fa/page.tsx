"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  AuthPageShell,
  Card,
  CredentialsTwoFactorForm,
  PageHeader,
  useSecureAuthUi,
} from "@tgoliveira/secure-auth/react";
import { OAuthTwoFactorChallenge } from "@/features/auth/oauth-two-factor-challenge";
import { sanitizeAuthCallbackUrl } from "@/lib/auth/safe-auth-callback";

function LoginTwoFactorContent() {
  const searchParams = useSearchParams();
  const ui = useSecureAuthUi();
  const mode = searchParams.get("mode") === "credentials" ? "credentials" : "oauth";
  const errorCode = searchParams.get("error") ?? undefined;
  const rawCallback = searchParams.get("callbackUrl") ?? searchParams.get("returnTo");
  const afterLoginPath = sanitizeAuthCallbackUrl(rawCallback);
  const title = ui?.messages.loginTwoFactorTitle ?? "Two-factor verification";
  const description =
    ui?.messages.loginTwoFactorDescription ??
    "Enter the 6-digit code from your authenticator app to finish signing in.";

  return (
    <AuthPageShell width="narrow">
      <PageHeader title={title} description={description} />
      <Card className="space-y-4">
        <Alert variant="info">
          Enter the one-time code from your authenticator app to finish signing in. When
          two-factor authentication is enabled, it is required after password, passkey, and
          OAuth sign-in.
        </Alert>
        {mode === "credentials" ? (
          <CredentialsTwoFactorForm
            errorCode={errorCode}
            formAction={ui?.paths.loginTwoFactor ?? "/login/2fa"}
            loginPath={ui?.paths.login ?? "/login"}
            submitLabel="Verify and continue"
          />
        ) : (
          <OAuthTwoFactorChallenge afterLoginPath={afterLoginPath} />
        )}
      </Card>
    </AuthPageShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginTwoFactorContent />
    </Suspense>
  );
}
