import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";
import { twoFactorVerifySchema } from "@/lib/validation/two-factor";
import {
  authLoginService,
  InvalidTwoFactorCodeError,
} from "@/server/services/auth-login-service";
import { twoFactorService } from "@/server/services/two-factor-service";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const enabled = await twoFactorService.isEnabledForUser(user.id);
    if (!enabled) {
      return NextResponse.json({ error: "Two-factor authentication is not enabled" }, { status: 400 });
    }

    const body = await parseJsonBody(request);
    const parsed = twoFactorVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await authLoginService.verifyOAuthTwoFactor(
      user.id,
      parsed.data,
      getClientIp(request)
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof InvalidTwoFactorCodeError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return apiError(error, "POST /api/auth/login/verify-2fa-oauth");
  }
}
