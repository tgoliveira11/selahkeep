import { getSessionMaxAgeMs, getSessionLastUsedUpdateIntervalMs } from "@/lib/session-config";
import { hashIp, maskIp } from "@/lib/session-ip";
import { parseUserAgentMetadata, hashUserAgent } from "@/lib/user-agent-metadata";
import type { AccountAuthMethod, AccountSessionView } from "@/lib/account-session-types";
import { getClientIp } from "@/lib/request-ip";
import { accountSessionRepository } from "@/server/repositories/account-session-repository";
import { auditRepository } from "@/server/repositories/audit-repository";
import { enforceRateLimit } from "@/server/policies/rate-limit";
import { NotFoundError } from "@/server/services/account-service";

const lastTouchBySession = new Map<string, number>();

export function resetSessionTouchCacheForTests(): void {
  lastTouchBySession.clear();
}

function normalizeAuthMethod(value?: string | null): AccountAuthMethod {
  switch (value) {
    case "password":
    case "google":
    case "apple":
    case "passkey":
      return value;
    default:
      return "unknown";
  }
}

export function mapProviderToAuthMethod(
  provider?: string | null,
  loginAuthMethod?: string | null
): AccountAuthMethod {
  if (provider === "google") return "google";
  if (provider === "apple") return "apple";
  if (provider === "login-token") {
    return normalizeAuthMethod(loginAuthMethod ?? "password");
  }
  if (provider === "credentials") return "password";
  return "unknown";
}

function toSessionView(
  row: {
    id: string;
    authMethod: string;
    browser: string | null;
    platform: string | null;
    deviceType: string | null;
    ipMasked: string | null;
    createdAt: Date;
    lastUsedAt: Date;
    expiresAt: Date;
  },
  currentSessionId?: string
): AccountSessionView {
  return {
    id: row.id,
    isCurrent: row.id === currentSessionId,
    authMethod: normalizeAuthMethod(row.authMethod),
    browser: row.browser ?? "unknown",
    platform: row.platform ?? "unknown",
    deviceType: row.deviceType ?? "unknown",
    ipMasked: row.ipMasked ?? "partially hidden",
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  };
}

function requestMetadata(request: Request) {
  const userAgent = request.headers.get("user-agent") ?? "";
  const ip = getClientIp(request);
  const ua = parseUserAgentMetadata(userAgent);
  return {
    ip,
    ipHash: hashIp(ip),
    ipMasked: maskIp(ip),
    userAgentHash: userAgent ? hashUserAgent(userAgent) : null,
    browser: ua.browser,
    platform: ua.platform,
    deviceType: ua.deviceType,
  };
}

export const accountSessionService = {
  mapProviderToAuthMethod,

  async createSession(input: {
    userId: string;
    authMethod: AccountAuthMethod;
    request?: Request;
  }) {
    const expiresAt = new Date(Date.now() + getSessionMaxAgeMs());
    const metadata = input.request ? requestMetadata(input.request) : null;
    const row = await accountSessionRepository.create({
      userId: input.userId,
      authMethod: input.authMethod,
      browser: metadata?.browser,
      platform: metadata?.platform,
      deviceType: metadata?.deviceType,
      ipHash: metadata?.ipHash,
      ipMasked: metadata?.ipMasked,
      userAgentHash: metadata?.userAgentHash,
      expiresAt,
    });
    await auditRepository.record("session_created", input.userId, {
      endpoint: "/api/auth/callback",
      provider: input.authMethod,
    });
    return row;
  },

  async assertSessionActive(sessionId: string | undefined, userId: string | undefined) {
    if (!sessionId || !userId) return false;
    return accountSessionRepository.isActive(sessionId, userId);
  },

  async touchSessionThrottled(sessionId: string, userId: string) {
    const intervalMs = getSessionLastUsedUpdateIntervalMs();
    const now = Date.now();
    const last = lastTouchBySession.get(sessionId) ?? 0;
    if (now - last < intervalMs) return;
    const updated = await accountSessionRepository.touchLastUsed(sessionId, userId);
    if (updated) {
      lastTouchBySession.set(sessionId, now);
    }
  },

  async enrichFromRequest(sessionId: string, userId: string, request: Request) {
    const metadata = requestMetadata(request);
    await accountSessionRepository.updateMetadata(sessionId, userId, {
      browser: metadata.browser,
      platform: metadata.platform,
      deviceType: metadata.deviceType,
      ipHash: metadata.ipHash,
      ipMasked: metadata.ipMasked,
      userAgentHash: metadata.userAgentHash ?? undefined,
    });
    await accountSessionService.touchSessionThrottled(sessionId, userId);
  },

  async listSessions(userId: string, currentSessionId?: string) {
    const rows = await accountSessionRepository.findActiveByUserId(userId);
    return {
      sessions: rows.map((row) => toSessionView(row, currentSessionId)),
    };
  },

  async revokeSession(userId: string, sessionId: string, currentSessionId?: string, ip?: string) {
    await enforceRateLimit({
      operation: "account.session_revoke",
      userId,
      ip,
      endpoint: "/api/account/sessions/:id",
    });

    const row = await accountSessionRepository.revokeById(sessionId, userId);
    if (!row) {
      await auditRepository.record("session_revoke_failed", userId, {
        endpoint: "/api/account/sessions/:id",
        errorCode: "not_found",
      });
      throw new NotFoundError("Session not found");
    }

    await auditRepository.record("session_revoked", userId, {
      endpoint: "/api/account/sessions/:id",
    });

    return {
      revoked: true,
      signOut: sessionId === currentSessionId,
    };
  },

  async revokeOtherSessions(userId: string, currentSessionId: string, ip?: string) {
    await enforceRateLimit({
      operation: "account.session_revoke_others",
      userId,
      ip,
      endpoint: "/api/account/sessions/revoke-others",
    });

    const revoked = await accountSessionRepository.revokeAllExcept(userId, currentSessionId);
    await auditRepository.record("all_other_sessions_revoked", userId, {
      endpoint: "/api/account/sessions/revoke-others",
    });
    return { revokedCount: revoked.length };
  },

  async revokeOnSignOut(userId: string, sessionId: string | undefined) {
    if (!sessionId) return { revoked: false };
    const row = await accountSessionRepository.revokeById(sessionId, userId);
    if (!row) return { revoked: false };
    await auditRepository.record("session_revoked", userId, {
      endpoint: "/api/auth/signout",
      reason: "sign_out",
    });
    return { revoked: true };
  },

  async revokeCurrentSession(userId: string, sessionId: string | undefined) {
    if (!sessionId) {
      return { revoked: false };
    }
    return accountSessionService.revokeOnSignOut(userId, sessionId);
  },

  async revokeAllSessions(userId: string, ip?: string) {
    await enforceRateLimit({
      operation: "account.session_revoke_all",
      userId,
      ip,
      endpoint: "/api/account/sessions/revoke-all",
    });

    const revoked = await accountSessionRepository.revokeAllForUser(userId);
    await auditRepository.record("all_sessions_revoked", userId, {
      endpoint: "/api/account/sessions/revoke-all",
    });
    return { revokedCount: revoked.length, signOut: true };
  },
};
