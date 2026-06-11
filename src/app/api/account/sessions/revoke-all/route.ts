import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { accountSessionService } from "@/server/services/account-session-service";

export async function POST(request: Request) {
  try {
    const user = await requireFullyAuthenticatedUser();
    const result = await accountSessionService.revokeAllSessions(user.id, getClientIp(request));
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/account/sessions/revoke-all");
  }
}
