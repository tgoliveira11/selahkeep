import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { users } from "@tgoliveira/secure-auth/drizzle/schema";
import {
  applyContentSecurityPolicy,
  createContentSecurityPolicyNonce,
} from "@/lib/security/content-security-policy";
import { sanitizeAuthCallbackUrl } from "@/lib/auth/safe-auth-callback";
import { buildSecureAuthUiPublicConfigFromEnv } from "@/lib/env/secure-auth-from-env";
import { readBoolEnv } from "@/lib/env/parse";
import { isPlatformAdminUser } from "@/lib/auth/require-platform-admin";
import { secureAuthDb } from "@/lib/secure-auth-db";

const secureAuthUiConfig = buildSecureAuthUiPublicConfigFromEnv(process.env);
const adminEnabled = readBoolEnv(process.env, "AUTH_ADMIN_ENABLED", false);

const GUEST_ONLY_PATHS = [
  secureAuthUiConfig.paths.login,
  secureAuthUiConfig.paths.register,
  secureAuthUiConfig.paths.forgotPassword,
];

function isGuestOnlyPath(pathname: string): boolean {
  return GUEST_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function isFullyAuthenticatedToken(
  token: Awaited<ReturnType<typeof getToken>>
): boolean {
  if (!token || typeof token === "string" || !token.sub || token.sessionInvalidated) {
    return false;
  }
  if (token.twoFactorPending === true && token.twoFactorVerified === false) {
    return false;
  }
  if (token.emailVerificationRequired === true) {
    return false;
  }
  return true;
}

const TWO_FACTOR_ALLOWED_PREFIXES = [
  "/login",
  "/api/auth",
  "/api/auth/login",
  "/_next",
  "/icon.svg",
  "/apple-icon",
  "/account-deleted",
];

function isTwoFactorAllowedPath(pathname: string): boolean {
  return TWO_FACTOR_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/** Package login pages POST to /login and /login/2fa; handlers live under /api/auth/login/*. */
function rewritePackageLoginFormPost(request: NextRequest): NextResponse | null {
  if (request.method !== "POST") return null;

  const { pathname } = request.nextUrl;
  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/api/auth/login/start-form";
    return NextResponse.rewrite(url);
  }

  if (pathname === "/login/2fa") {
    const url = request.nextUrl.clone();
    url.pathname = "/api/auth/login/verify-2fa-form";
    return NextResponse.rewrite(url);
  }

  return null;
}

function nextWithContentSecurityPolicy(request: NextRequest): NextResponse {
  const nonce = createContentSecurityPolicyNonce();
  const requestHeaders = new Headers(request.headers);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  applyContentSecurityPolicy(requestHeaders, response, nonce);
  return response;
}

async function tokenIsPlatformAdmin(
  token: Awaited<ReturnType<typeof getToken>>
): Promise<boolean> {
  if (!token || typeof token === "string" || !token.sub || typeof token.sub !== "string") {
    return false;
  }

  const rows = await secureAuthDb
    .select({ email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, token.sub))
    .limit(1);

  const user = rows[0];
  if (!user) return false;
  return isPlatformAdminUser(user, process.env);
}

export async function proxy(request: NextRequest) {
  const formRewrite = rewritePackageLoginFormPost(request);
  if (formRewrite) {
    return formRewrite;
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (token?.twoFactorPending && token.twoFactorVerified === false) {
    const pathname = request.nextUrl.pathname;
    if (!isTwoFactorAllowedPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login/2fa";
      url.search = "";
      const attemptedPath = `${pathname}${request.nextUrl.search}`;
      url.searchParams.set("callbackUrl", sanitizeAuthCallbackUrl(attemptedPath));
      return NextResponse.redirect(url);
    }
  }

  if (
    secureAuthUiConfig.auth.redirectAuthenticatedFromGuestPages &&
    isFullyAuthenticatedToken(token)
  ) {
    const pathname = request.nextUrl.pathname;
    if (isGuestOnlyPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = secureAuthUiConfig.auth.authenticatedRedirectPath;
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (pathname === secureAuthUiConfig.paths.loginComplete) {
      const url = request.nextUrl.clone();
      url.pathname = secureAuthUiConfig.auth.authenticatedRedirectPath;
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (pathname === secureAuthUiConfig.paths.loginTwoFactor) {
      const url = request.nextUrl.clone();
      url.pathname = secureAuthUiConfig.auth.authenticatedRedirectPath;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  const pathname = request.nextUrl.pathname;
  const adminPath = secureAuthUiConfig.paths.adminPanel;
  if (
    adminEnabled &&
    adminPath &&
    (pathname === adminPath || pathname.startsWith(`${adminPath}/`))
  ) {
    if (!isFullyAuthenticatedToken(token)) {
      const url = request.nextUrl.clone();
      url.pathname = secureAuthUiConfig.paths.login;
      url.search = "";
      const attemptedPath = `${pathname}${request.nextUrl.search}`;
      url.searchParams.set("callbackUrl", sanitizeAuthCallbackUrl(attemptedPath));
      return NextResponse.redirect(url);
    }

    const isAdmin = await tokenIsPlatformAdmin(token);
    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = secureAuthUiConfig.auth.authenticatedRedirectPath;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return nextWithContentSecurityPolicy(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
