import { runInTransaction } from "@/lib/db/transaction";
import { validatePasswordForSubmission } from "@/lib/password-policy";
import { userRepository } from "@/server/repositories/user-repository";
import {
  accountTokenRepository,
  type AccountTokenType,
} from "@/server/repositories/account-token-repository";
import { auditRepository } from "@/server/repositories/audit-repository";
import { enforceRateLimit } from "@/server/policies/rate-limit";
import { hashEmailForScope } from "@/server/policies/email-scope";
import { createOpaqueToken, hashOpaqueToken } from "@/server/policies/login-token";
import { hashPassword, verifyPassword } from "@/server/policies/password-hashing";
import { sendEmail } from "@/server/email/send-email";
import {
  passwordResetEmailContent,
  verificationEmailContent,
} from "@/server/email/account-email-templates";
import { GENERIC_FORGOT_PASSWORD_MESSAGE } from "@/lib/account-auth-messages";
import {
  NotFoundError,
  ReauthenticationRequiredError,
  ValidationError,
} from "@/server/services/account-service";

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function isCredentialsAccount(user: { authProvider: string; passwordHash: string | null }) {
  return user.authProvider === "credentials" && Boolean(user.passwordHash);
}

async function issueAccountToken(
  userId: string,
  email: string,
  type: AccountTokenType,
  ttlMs: number
) {
  await accountTokenRepository.revokeActiveTokensForUser(userId, type);
  const token = createOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  await accountTokenRepository.create({
    userId,
    email,
    type,
    tokenHash,
    expiresAt: new Date(Date.now() + ttlMs),
  });
  return token;
}

export const accountAuthService = {
  async sendVerificationEmailForUser(userId: string, ip?: string) {
    const user = await userRepository.findById(userId);
    if (!user || !isCredentialsAccount(user)) {
      throw new NotFoundError("Account not found");
    }
    if (user.emailVerifiedAt) {
      return { alreadyVerified: true as const };
    }

    await enforceRateLimit({
      operation: "auth.verify_email_resend",
      userId,
      ip,
      endpoint: "/api/auth/verify-email/resend",
    });

    const token = await issueAccountToken(
      user.id,
      user.email,
      "email_verification",
      EMAIL_VERIFICATION_TTL_MS
    );
    const content = verificationEmailContent(token);
    await sendEmail({ to: user.email, ...content });
    await auditRepository.record("email_verification_requested", user.id, {
      endpoint: "/api/auth/verify-email/resend",
    });
    return { alreadyVerified: false as const };
  },

  async resendVerificationByEmail(email: string, ip?: string) {
    const emailScope = hashEmailForScope(email);
    await enforceRateLimit({
      operation: "auth.verify_email_resend",
      userId: emailScope,
      ip,
      endpoint: "/api/auth/verify-email/resend",
      keyMode: "email",
    });

    const user = await userRepository.findByEmail(email);
    if (user && isCredentialsAccount(user) && !user.emailVerifiedAt) {
      const token = await issueAccountToken(
        user.id,
        user.email,
        "email_verification",
        EMAIL_VERIFICATION_TTL_MS
      );
      const content = verificationEmailContent(token);
      await sendEmail({ to: user.email, ...content });
      await auditRepository.record("email_verification_requested", user.id, {
        endpoint: "/api/auth/verify-email/resend",
      });
    }

    return { message: "If your account needs verification, we sent a new link." };
  },

  async confirmEmailVerification(token: string, ip?: string) {
    await enforceRateLimit({
      operation: "auth.verify_email_confirm",
      ip,
      endpoint: "/api/auth/verify-email/confirm",
      keyMode: "ip",
    });

    const tokenHash = hashOpaqueToken(token);
    const row = await accountTokenRepository.consumeValidToken(
      tokenHash,
      "email_verification"
    );
    if (!row?.userId) {
      await auditRepository.record("email_verification_failed", undefined, {
        endpoint: "/api/auth/verify-email/confirm",
        errorCode: "invalid_or_expired",
      });
      throw new ValidationError("This verification link is invalid or expired.");
    }

    const user = await userRepository.findById(row.userId);
    if (!user) {
      throw new ValidationError("This verification link is invalid or expired.");
    }

    if (!user.emailVerifiedAt) {
      await userRepository.markEmailVerified(user.id);
    }
    await auditRepository.record("email_verified", user.id, {
      endpoint: "/api/auth/verify-email/confirm",
    });
    return { verified: true, email: user.email };
  },

  async requestPasswordReset(email: string, ip?: string) {
    const emailScope = hashEmailForScope(email);
    await enforceRateLimit({
      operation: "auth.forgot_password",
      userId: emailScope,
      ip,
      endpoint: "/api/auth/forgot-password",
      keyMode: "email_ip",
    });

    const user = await userRepository.findByEmail(email);
    if (user && isCredentialsAccount(user)) {
      const token = await issueAccountToken(
        user.id,
        user.email,
        "password_reset",
        PASSWORD_RESET_TTL_MS
      );
      const content = passwordResetEmailContent(token);
      await sendEmail({ to: user.email, ...content });
      await auditRepository.record("password_reset_requested", user.id, {
        endpoint: "/api/auth/forgot-password",
      });
    }

    return { message: GENERIC_FORGOT_PASSWORD_MESSAGE };
  },

  async validatePasswordResetToken(token: string) {
    const tokenHash = hashOpaqueToken(token);
    const row = await accountTokenRepository.findValidToken(tokenHash, "password_reset");
    return { valid: Boolean(row) };
  },

  async resetPassword(token: string, newPassword: string, ip?: string) {
    await enforceRateLimit({
      operation: "auth.reset_password",
      ip,
      endpoint: "/api/auth/reset-password",
      keyMode: "ip",
    });

    const policy = validatePasswordForSubmission(newPassword);
    if (!policy.valid) {
      throw new ValidationError(
        policy.assessment.messages[0] ?? "Password does not meet the configured policy."
      );
    }

    const tokenHash = hashOpaqueToken(token);
    const row = await runInTransaction(async (tx) => {
      const consumed = await accountTokenRepository.consumeValidToken(
        tokenHash,
        "password_reset",
        tx
      );
      if (!consumed?.userId) return null;

      const user = await userRepository.findById(consumed.userId);
      if (!user || !isCredentialsAccount(user)) return null;

      const passwordHash = await hashPassword(newPassword);
      await userRepository.updatePassword(user.id, passwordHash, tx);
      return consumed;
    });

    if (!row?.userId) {
      await auditRepository.record("password_reset_failed", undefined, {
        endpoint: "/api/auth/reset-password",
        errorCode: "invalid_or_expired",
      });
      throw new ValidationError("This reset link is invalid or expired.");
    }

    await auditRepository.record("password_reset_completed", row.userId, {
      endpoint: "/api/auth/reset-password",
    });
    return { success: true };
  },

  async changePassword(
    userId: string,
    input: { currentPassword: string; newPassword: string },
    ip?: string
  ) {
    await enforceRateLimit({
      operation: "account.password_change",
      userId,
      ip,
      endpoint: "/api/account/change-password",
    });

    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("Account not found");
    if (!user.passwordHash) {
      throw new ValidationError(
        "This account signs in with Google or Apple. Password change is not available unless you add an email/password sign-in method."
      );
    }

    const currentValid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!currentValid) {
      await auditRepository.record("password_change_failed", userId, {
        endpoint: "/api/account/change-password",
        errorCode: "incorrect_current_password",
      });
      throw new ReauthenticationRequiredError("Current password is incorrect.");
    }

    const policy = validatePasswordForSubmission(input.newPassword);
    if (!policy.valid) {
      await auditRepository.record("password_change_failed", userId, {
        endpoint: "/api/account/change-password",
        errorCode: "policy_rejected",
      });
      throw new ValidationError(
        policy.assessment.messages[0] ?? "Password does not meet the configured policy."
      );
    }

    const passwordHash = await hashPassword(input.newPassword);
    await userRepository.updatePassword(userId, passwordHash);
    await auditRepository.record("password_changed", userId, {
      endpoint: "/api/account/change-password",
    });
    return { success: true };
  },

  async getAccountAuthStatus(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("Account not found");
    return {
      email: user.email,
      authProvider: user.authProvider,
      hasPassword: Boolean(user.passwordHash),
      emailVerified: Boolean(user.emailVerifiedAt),
      canChangePassword: Boolean(user.passwordHash),
    };
  },
};
