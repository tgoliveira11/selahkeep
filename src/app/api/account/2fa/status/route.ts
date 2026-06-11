import { NextResponse } from "next/server";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { apiError } from "@/lib/api-helpers";
import { twoFactorService } from "@/server/services/two-factor-service";

export async function GET() {
  try {
    const user = await requireFullyAuthenticatedUser();
    const status = await twoFactorService.getStatus(user.id);
    return NextResponse.json(status);
  } catch (error) {
    return apiError(error, "GET /api/account/2fa/status");
  }
}
