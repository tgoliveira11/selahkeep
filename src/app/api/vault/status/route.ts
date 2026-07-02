import { NextResponse } from "next/server";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { vaultService } from "@/server/services/vault-service";
import { apiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const user = await requireFullyAuthenticatedUser();
    const status = await vaultService.getStatus(user.id);
    return NextResponse.json(status);
  } catch (error) {
    return apiError(error, "GET /api/vault/status");
  }
}
