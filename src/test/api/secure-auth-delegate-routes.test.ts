import { describe, it, expect } from "vitest";

const delegateRoutes = [
  ["register", () => import("@/app/api/auth/register/route")],
  ["forgot-password", () => import("@/app/api/auth/forgot-password/route")],
  ["reset-password", () => import("@/app/api/auth/reset-password/route")],
  ["password-policy", () => import("@/app/api/auth/password-policy/route")],
  ["verify-email confirm", () => import("@/app/api/auth/verify-email/confirm/route")],
  ["verify-email resend", () => import("@/app/api/auth/verify-email/resend/route")],
  ["login start", () => import("@/app/api/auth/login/start/route")],
  ["login verify 2fa", () => import("@/app/api/auth/login/verify-2fa/route")],
  ["login verify 2fa oauth", () => import("@/app/api/auth/login/verify-2fa-oauth/route")],
  ["passkey login verify", () => import("@/app/api/auth/passkey/login/verify/route")],
  ["account", () => import("@/app/api/account/route")],
  ["account auth-status", () => import("@/app/api/account/auth-status/route")],
  ["change-password", () => import("@/app/api/account/change-password/route")],
  ["account passkeys list", () => import("@/app/api/account/passkeys/route")],
  ["account passkeys register", () => import("@/app/api/account/passkeys/register/route")],
  ["account passkeys by id", () => import("@/app/api/account/passkeys/[id]/route")],
  ["2fa status", () => import("@/app/api/account/2fa/status/route")],
  ["2fa setup start", () => import("@/app/api/account/2fa/setup/start/route")],
  ["2fa setup verify", () => import("@/app/api/account/2fa/setup/verify/route")],
  ["2fa disable", () => import("@/app/api/account/2fa/disable/route")],
  ["2fa backup regenerate", () => import("@/app/api/account/2fa/backup-codes/regenerate/route")],
  ["sessions list", () => import("@/app/api/account/sessions/route")],
  ["sessions by id", () => import("@/app/api/account/sessions/[id]/route")],
  ["sessions ping", () => import("@/app/api/account/sessions/ping/route")],
  ["sessions revoke current", () => import("@/app/api/account/sessions/revoke-current/route")],
  ["sessions revoke others", () => import("@/app/api/account/sessions/revoke-others/route")],
  ["sessions revoke all", () => import("@/app/api/account/sessions/revoke-all/route")],
  ["nextauth", () => import("@/app/api/auth/[...nextauth]/route")],
] as const;

describe("secure-auth delegate API routes", () => {
  it.each(delegateRoutes)("loads %s route exports", async (_label, loadRoute) => {
    const route = await loadRoute();
    const handlers = Object.values(route).filter((value) => typeof value === "function");
    expect(handlers.length).toBeGreaterThan(0);
  });
});
