import { NextResponse } from "next/server";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { passkeyService } from "@/server/services/passkey-service";
import { apiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const user = await requireFullyAuthenticatedUser();
    const result = await passkeyService.listVaultUnlockCredentials(user.id);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "GET /api/passkeys/vault-unlock");
  }
}
