import { NextResponse } from "next/server";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { apiError } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";
import { twoFactorService } from "@/server/services/two-factor-service";

export async function POST(request: Request) {
  try {
    const user = await requireFullyAuthenticatedUser();
    const setup = await twoFactorService.startSetup(user.id, getClientIp(request));
    return NextResponse.json({
      qrCodeDataUrl: setup.qrCodeDataUrl,
      manualSetupKey: setup.manualSetupKey,
      issuer: setup.issuer,
      accountLabel: setup.accountLabel,
    });
  } catch (error) {
    return apiError(error, "POST /api/account/2fa/setup/start");
  }
}
