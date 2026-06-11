import { runInTransaction } from "@/lib/db/transaction";
import { userRepository } from "@/server/repositories/user-repository";
import { auditRepository } from "@/server/repositories/audit-repository";
import { verifyPassword } from "@/server/policies/password-hashing";
import { enforceRateLimit, RateLimitError } from "@/server/policies/rate-limit";

import { ACCOUNT_DELETION_CONFIRMATION_PHRASE } from "@/lib/account-deletion";

export { ACCOUNT_DELETION_CONFIRMATION_PHRASE };

export const accountService = {
  async getDeletionRequirements(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("Account not found");

    return {
      requiresPassword: Boolean(user.passwordHash),
      authProvider: user.authProvider,
      confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
    };
  },

  async deleteAccount(
    userId: string,
    input: { confirmationPhrase: string; password?: string },
    ip?: string
  ) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("Account not found");

    if (input.confirmationPhrase !== ACCOUNT_DELETION_CONFIRMATION_PHRASE) {
      throw new ValidationError("Confirmation phrase does not match");
    }

    if (user.passwordHash) {
      if (!input.password) {
        throw new ReauthenticationRequiredError("Password is required to delete this account");
      }
      const valid = await verifyPassword(input.password, user.passwordHash);
      if (!valid) {
        throw new ReauthenticationRequiredError("Incorrect password");
      }
    } else {
      // TODO_SECURITY_REVIEW_REQUIRED:
      // OAuth-only accounts rely on active session + confirmation phrase for deletion re-auth.
      // Add provider-specific re-authentication before beta if required by policy review.
    }

    await enforceRateLimit({
      operation: "account.delete",
      userId,
      ip,
      endpoint: "/api/account",
    });

    await auditRepository.record("account_deletion_requested", userId, {
      endpoint: "/api/account",
      authProvider: user.authProvider,
    });

    await runInTransaction(async (tx) => {
      await userRepository.deleteById(userId, tx);
    });

    return { success: true };
  },
};

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class ReauthenticationRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReauthenticationRequiredError";
  }
}

export { RateLimitError };
