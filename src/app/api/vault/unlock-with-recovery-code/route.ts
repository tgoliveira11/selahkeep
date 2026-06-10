import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { vaultService } from "@/server/services/vault-service";
import { apiError } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const ip = getClientIp(request);
    const result = await vaultService.unlockWithRecoveryCode(user.id, ip);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/vault/unlock-with-recovery-code");
  }
}
