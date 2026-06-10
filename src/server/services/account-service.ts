import { runInTransaction } from "@/lib/db/transaction";
import { userRepository } from "@/server/repositories/user-repository";
import { auditRepository } from "@/server/repositories/audit-repository";
import { enforceRateLimit, RateLimitError } from "@/server/policies/rate-limit";

export const accountService = {
  async deleteAccount(userId: string, ip?: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("Account not found");

    await enforceRateLimit({
      operation: "account.delete",
      userId,
      ip,
      endpoint: "/api/account",
    });

    await auditRepository.record("account_deletion_requested", userId, {
      endpoint: "/api/account",
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

export { RateLimitError };
