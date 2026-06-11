import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-helpers";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { accountSessionService } from "@/server/services/account-session-service";

export async function POST(request: Request) {
  try {
    const user = await requireFullyAuthenticatedUser();
    const result = await accountSessionService.revokeCurrentSession(
      user.id,
      user.accountSessionId
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/account/sessions/revoke-current");
  }
}
