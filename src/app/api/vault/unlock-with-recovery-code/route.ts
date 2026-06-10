import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { vaultService } from "@/server/services/vault-service";
import { apiError } from "@/lib/api-helpers";

export async function POST() {
  try {
    const user = await requireSessionUser();
    const result = await vaultService.unlockWithRecoveryCode(user.id);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/vault/unlock-with-recovery-code");
  }
}
