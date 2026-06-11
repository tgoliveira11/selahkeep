import { NextResponse } from "next/server";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";
import { twoFactorLoginVerifySchema } from "@/lib/validation/two-factor";
import {
  authLoginService,
  InvalidTwoFactorChallengeError,
  InvalidTwoFactorCodeError,
} from "@/server/services/auth-login-service";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request);
    const parsed = twoFactorLoginVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await authLoginService.verifyTwoFactorLogin(
      parsed.data.challengeToken,
      { code: parsed.data.code, backupCode: parsed.data.backupCode },
      getClientIp(request)
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof InvalidTwoFactorChallengeError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof InvalidTwoFactorCodeError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return apiError(error, "POST /api/auth/login/verify-2fa");
  }
}
