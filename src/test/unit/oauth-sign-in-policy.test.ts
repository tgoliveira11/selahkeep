import { describe, it, expect } from "vitest";
import {
  OAUTH_SIGN_IN_ERROR_CODES,
  evaluateOAuthSignIn,
  getOAuthSignInErrorMessage,
  isOAuthOnlyProvider,
  oauthSignInRedirectPath,
} from "@/modules/auth/lib/oauth-sign-in-policy";

describe("oauth sign-in policy", () => {
  it("rejects Microsoft sign-in when email is missing", () => {
    const result = evaluateOAuthSignIn({
      email: null,
      accountProvider: "azure-ad",
      existingUser: null,
    });

    expect(result).toEqual({
      action: "reject",
      redirectPath: oauthSignInRedirectPath(OAUTH_SIGN_IN_ERROR_CODES.EMAIL_REQUIRED),
    });
  });

  it("creates a user for first-time Microsoft OAuth sign-in", () => {
    const result = evaluateOAuthSignIn({
      email: "user@example.com",
      accountProvider: "azure-ad",
      existingUser: null,
    });

    expect(result).toEqual({
      action: "create_user",
      authProvider: "azure-ad",
    });
  });

  it("allows returning Microsoft users and marks email verified when needed", () => {
    const result = evaluateOAuthSignIn({
      email: "user@example.com",
      accountProvider: "azure-ad",
      existingUser: {
        authProvider: "azure-ad",
        emailVerifiedAt: null,
      },
    });

    expect(result).toEqual({
      action: "allow_existing",
      markEmailVerified: true,
    });
  });

  it("rejects unsafe automatic account linking across providers", () => {
    const result = evaluateOAuthSignIn({
      email: "user@example.com",
      accountProvider: "azure-ad",
      existingUser: {
        authProvider: "credentials",
        emailVerifiedAt: new Date(),
      },
    });

    expect(result.action).toBe("reject");
    if (result.action === "reject") {
      expect(result.redirectPath).toContain(OAUTH_SIGN_IN_ERROR_CODES.ACCOUNT_EXISTS);
    }
  });

  it("maps safe OAuth error messages without leaking secrets", () => {
    expect(getOAuthSignInErrorMessage(OAUTH_SIGN_IN_ERROR_CODES.EMAIL_REQUIRED)).toMatch(
      /email address/i
    );
    expect(getOAuthSignInErrorMessage(OAUTH_SIGN_IN_ERROR_CODES.ACCOUNT_EXISTS)).toMatch(
      /different sign-in method/i
    );
    expect(getOAuthSignInErrorMessage("OAuthSignin")).toMatch(/application \(client\) id guid/i);
    expect(getOAuthSignInErrorMessage("Callback")).toMatch(/web redirect uri/i);
    expect(getOAuthSignInErrorMessage("AccessDenied")).toMatch(/cancelled or denied/i);
    expect(getOAuthSignInErrorMessage(null)).toBeNull();
  });

  it("treats OAuth-only providers as non-credentials", () => {
    expect(isOAuthOnlyProvider("azure-ad")).toBe(true);
    expect(isOAuthOnlyProvider("google")).toBe(true);
    expect(isOAuthOnlyProvider("credentials")).toBe(false);
  });

  it("allows login-token provider without email checks", () => {
    expect(
      evaluateOAuthSignIn({
        email: undefined,
        accountProvider: "login-token",
        existingUser: null,
      })
    ).toEqual({ action: "allow_existing", markEmailVerified: false });
  });

  it("allows existing sessions when provider is missing", () => {
    expect(
      evaluateOAuthSignIn({
        email: undefined,
        accountProvider: "",
        existingUser: null,
      })
    ).toEqual({ action: "allow_existing", markEmailVerified: false });
  });
});
