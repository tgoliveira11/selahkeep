import { auditRepository } from "@/server/repositories/audit-repository";
import { userRepository } from "@/server/repositories/user-repository";
import { enforceRateLimit } from "@/server/policies/rate-limit";

export const authService = {
  async recordLoginFailure(email: string) {
    const user = await userRepository.findByEmail(email);
    await auditRepository.record("login_failure", user?.id, {
      endpoint: "/api/auth/callback/credentials",
      errorCode: "invalid_credentials",
    });
  },

  async recordLoginSuccess(userId: string, provider: string) {
    await auditRepository.record("login_success", userId, {
      provider,
      endpoint: "/api/auth/callback",
    });
  },

  async assertLoginAllowed(email: string, ip?: string) {
    await enforceRateLimit({
      operation: "auth.login",
      userId: email.toLowerCase(),
      ip,
      endpoint: "/api/auth/callback/credentials",
    });
  },
};
