import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";
import { requireFullyAuthenticatedUser, UnauthorizedError } from "@/lib/auth/session";
import { accountSessionService } from "@/server/services/account-session-service";

export async function POST(request: Request) {
  try {
    const user = await requireFullyAuthenticatedUser();
    if (!user.accountSessionId) {
      throw new UnauthorizedError("Current session could not be identified");
    }
    const result = await accountSessionService.revokeOtherSessions(
      user.id,
      user.accountSessionId,
      getClientIp(request)
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/account/sessions/revoke-others");
  }
}
