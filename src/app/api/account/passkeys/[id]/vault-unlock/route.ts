import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { passkeyVaultEnvelopeService } from "@/server/services/passkey-vault-envelope-service";
import { apiError } from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireSessionUser();
    const { id } = await context.params;
    const status = await passkeyVaultEnvelopeService.getVaultUnlockStatus(user.id, id);
    return NextResponse.json(status);
  } catch (error) {
    return apiError(error, "GET /api/account/passkeys/:id/vault-unlock");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireSessionUser();
    const { id } = await context.params;
    const result = await passkeyVaultEnvelopeService.disableVaultUnlock(user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "DELETE /api/account/passkeys/:id/vault-unlock");
  }
}
