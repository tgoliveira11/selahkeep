export const OAUTH_SIGN_IN_ERROR_CODES = {
  EMAIL_REQUIRED: "OAuthEmailRequired",
  ACCOUNT_EXISTS: "OAuthAccountExists",
} as const;

export type OAuthSignInErrorCode =
  (typeof OAUTH_SIGN_IN_ERROR_CODES)[keyof typeof OAUTH_SIGN_IN_ERROR_CODES];

const SAFE_OAUTH_ERROR_MESSAGES: Record<OAuthSignInErrorCode, string> = {
  [OAUTH_SIGN_IN_ERROR_CODES.EMAIL_REQUIRED]:
    "We could not complete sign-in because Microsoft did not provide an email address. Try another sign-in method or contact support.",
  [OAUTH_SIGN_IN_ERROR_CODES.ACCOUNT_EXISTS]:
    "An account with this email already exists using a different sign-in method. Sign in with your original method or contact support.",
};

const NEXT_AUTH_OAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin:
    "Social sign-in could not start. For Microsoft, set AUTH_AZURE_AD_ID to the Application (client) ID GUID from Microsoft Entra (Overview page), not the client secret or tenant ID. Restart the app after updating .env.local.",
  OAuthCallback:
    "Social sign-in could not be completed. For Microsoft, confirm the Entra redirect URI is a Web platform URL matching /api/auth/callback/azure-ad exactly, and that AUTH_AZURE_AD_ID and AUTH_AZURE_AD_SECRET are set correctly.",
  Callback:
    "Social sign-in could not be completed after the provider redirected back. For Microsoft, use a Web redirect URI (not SPA-only) and restart the app after env changes.",
  AccessDenied: "Sign-in was cancelled or denied. Please try again.",
  Configuration:
    "Sign-in is not configured correctly on the server. Contact support if this continues.",
};

export function getOAuthSignInErrorMessage(errorCode: string | null | undefined): string | null {
  if (!errorCode) return null;

  const known =
    SAFE_OAUTH_ERROR_MESSAGES[errorCode as OAuthSignInErrorCode] ??
    NEXT_AUTH_OAUTH_ERROR_MESSAGES[errorCode];

  return known ?? "Sign-in could not be completed. Please try again.";
}

export function oauthSignInRedirectPath(errorCode: OAuthSignInErrorCode): string {
  return `/login?error=${errorCode}`;
}

export type OAuthSignInEvaluation =
  | { action: "reject"; redirectPath: string }
  | { action: "allow_existing"; markEmailVerified: boolean }
  | { action: "create_user"; authProvider: string };

export function evaluateOAuthSignIn(input: {
  email: string | null | undefined;
  accountProvider: string | null | undefined;
  existingUser: { authProvider: string; emailVerifiedAt: Date | null } | null;
}): OAuthSignInEvaluation {
  const provider = input.accountProvider;
  if (!provider || provider === "login-token") {
    return { action: "allow_existing", markEmailVerified: false };
  }

  const email = input.email?.trim();
  if (!email) {
    return {
      action: "reject",
      redirectPath: oauthSignInRedirectPath(OAUTH_SIGN_IN_ERROR_CODES.EMAIL_REQUIRED),
    };
  }

  const existing = input.existingUser;
  if (!existing) {
    return { action: "create_user", authProvider: provider };
  }

  if (existing.authProvider !== provider) {
    return {
      action: "reject",
      redirectPath: oauthSignInRedirectPath(OAUTH_SIGN_IN_ERROR_CODES.ACCOUNT_EXISTS),
    };
  }

  return {
    action: "allow_existing",
    markEmailVerified: !existing.emailVerifiedAt,
  };
}

export function isOAuthOnlyProvider(authProvider: string): boolean {
  return authProvider !== "credentials";
}
