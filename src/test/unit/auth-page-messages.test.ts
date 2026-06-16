import { describe, it, expect } from "vitest";
import { authPageMessages } from "@/lib/auth/auth-page-messages";

describe("auth page messages", () => {
  it("uses account-focused login copy without letter-editor privacy text", () => {
    expect(authPageMessages.loginTitle).toBe("Welcome back");
    expect(authPageMessages.loginDescription).toBe("Sign in to continue to your account.");
    expect(authPageMessages.loginDescription).not.toMatch(/letter is protected on this device/i);
    expect(authPageMessages.registerDescription).not.toMatch(/protected on this device/i);
  });

  it("defines copy for password and email flows", () => {
    expect(authPageMessages.forgotPasswordTitle).toBe("Reset your password");
    expect(authPageMessages.forgotPasswordDescription).toBe(
      "Enter your email and we'll send instructions if an account exists."
    );
    expect(authPageMessages.resetPasswordTitle).toBe("Choose a new password");
    expect(authPageMessages.resetPasswordDescription).toBe(
      "This changes your account password only."
    );
    expect(authPageMessages.checkEmailTitle).toBe("Check your email");
    expect(authPageMessages.verifyEmailTitle).toBe("Verify your email");
    expect(authPageMessages.verifyEmailDescription).toBe(
      "Confirm your email address to finish setting up your account."
    );
  });
});
