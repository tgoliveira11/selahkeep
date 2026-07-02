import { NextResponse } from "next/server";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { passkeyService } from "@/server/services/passkey-service";
import { apiError } from "@/lib/api-helpers";

export async function DELETE() {
  try {
    const user = await requireFullyAuthenticatedUser();
    const result = await passkeyService.removeAll(user.id);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "DELETE /api/passkeys");
  }
}
