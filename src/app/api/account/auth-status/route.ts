import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/auth/session";
import { accountAuthService } from "@/server/services/account-auth-service";

export async function GET() {
  try {
    const session = await requireSessionUser();
    const status = await accountAuthService.getAccountAuthStatus(session.id);
    return NextResponse.json(status);
  } catch (error) {
    return apiError(error, "GET /api/account/auth-status");
  }
}
