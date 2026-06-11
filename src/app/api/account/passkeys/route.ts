import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { apiError } from "@/lib/api-helpers";
import { passkeyAccountService } from "@/server/services/passkey-account-service";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const passkeys = await passkeyAccountService.listPasskeys(user.id);
    return NextResponse.json({ passkeys });
  } catch (error) {
    return apiError(error, "GET /api/account/passkeys");
  }
}
