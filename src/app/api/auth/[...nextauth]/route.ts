import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { getClientIp } from "@/lib/request-ip";
import { runWithLoginRequestContext } from "@/lib/auth/login-request-context";

const handler = NextAuth(authOptions);

async function wrappedHandler(request: Request, context: unknown) {
  const ip = getClientIp(request);
  return runWithLoginRequestContext(ip, () => handler(request, context));
}

export { wrappedHandler as GET, wrappedHandler as POST };
