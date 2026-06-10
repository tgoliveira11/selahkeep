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
    const normalizedEmail = email.toLowerCase();
    const endpoint = "/api/auth/callback/credentials";

    await enforceRateLimit({
      operation: "auth.login",
      userId: normalizedEmail,
      endpoint,
      keyMode: "email",
    });

    if (ip) {
      await enforceRateLimit({
        operation: "auth.login",
        ip,
        endpoint,
        keyMode: "ip",
      });
      await enforceRateLimit({
        operation: "auth.login",
        userId: normalizedEmail,
        ip,
        endpoint,
        keyMode: "email_ip",
      });
    }
  },
};
