/** Product-specific copy for @tgoliveira/secure-auth pages (SecureAuthUIProvider `messages`). */
export const authPageMessages = {
  loginTitle: "Welcome back",
  loginDescription: "Sign in to continue to your account.",
  registerTitle: "Create your account",
  registerDescription: "Start writing private notes in a protected space.",
  loginTwoFactorTitle: "Two-factor verification",
  loginTwoFactorDescription:
    "Enter the 6-digit code from your authenticator app to finish signing in.",
  forgotPasswordTitle: "Reset your password",
  forgotPasswordDescription:
    "Enter your email and we'll send instructions if an account exists.",
  resetPasswordTitle: "Choose a new password",
  resetPasswordDescription: "This changes your account password only.",
  verifyEmailTitle: "Verify your email",
  verifyEmailDescription: "Confirm your email address to finish setting up your account.",
  checkEmailTitle: "Check your email",
  verifyEmailTitleSuccess: "Your email has been verified",
  verifyEmailTitleInvalid: "Verification link expired",
  loginCompleteTitle: "Signing you in",
  loginCompleteDescription: "Finishing your sign-in securely.",
  registerLinkLabel: "Create one",
  securitySettingsTitle: "Security settings",
  securitySettingsDescription:
    "Manage passkeys and two-factor authentication for signing in to your account.",
  sessionsSettingsTitle: "Active sessions",
  dashboardTitle: "My notes",
} as const;
