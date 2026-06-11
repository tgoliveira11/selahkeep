import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-helpers";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { accountSessionService } from "@/server/services/account-session-service";

export async function POST(request: Request) {
  try {
    const user = await requireFullyAuthenticatedUser();
    if (user.accountSessionId) {
      await accountSessionService.enrichFromRequest(
        user.accountSessionId,
        user.id,
        request
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "POST /api/account/sessions/ping");
  }
}
