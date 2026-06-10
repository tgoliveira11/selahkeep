import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { vaultService } from "@/server/services/vault-service";
import { apiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const envelopes = await vaultService.getTrustedDeviceEnvelopes(user.id);
    return NextResponse.json(envelopes);
  } catch (error) {
    return apiError(error, "GET /api/vault/device-envelopes");
  }
}
