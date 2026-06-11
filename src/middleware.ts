import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (token?.twoFactorPending && token.twoFactorVerified === false) {
    const pathname = request.nextUrl.pathname;
    if (!isTwoFactorAllowedPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login/2fa";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
