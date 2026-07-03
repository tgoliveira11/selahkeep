import { NextResponse } from "next/server";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { passkeyService } from "@/server/services/passkey-service";
import { apiError } from "@/lib/api-helpers";
import { readVaultDeviceBindingIdFromCookies } from "@/lib/passkey/vault-device-binding-cookie";

export async function GET() {
  try {
    const user = await requireFullyAuthenticatedUser();
    const deviceBindingId = await readVaultDeviceBindingIdFromCookies();
    const result = await passkeyService.listVaultUnlockCredentials(user.id, deviceBindingId);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "GET /api/passkeys/vault-unlock");
  }
}
