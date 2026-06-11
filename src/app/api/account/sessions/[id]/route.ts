import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { accountSessionService } from "@/server/services/account-session-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireFullyAuthenticatedUser();
    const { id } = await context.params;
    const result = await accountSessionService.revokeSession(
      user.id,
      id,
      user.accountSessionId,
      getClientIp(request)
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "DELETE /api/account/sessions/:id");
  }
}
