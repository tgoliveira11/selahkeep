import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { passkeyAccountService } from "@/server/services/passkey-account-service";
import { apiError } from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireSessionUser();
    const { id } = await context.params;
    const result = await passkeyAccountService.removePasskey(user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "DELETE /api/account/passkeys/:id");
  }
}
