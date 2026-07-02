import { NextResponse } from "next/server";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { recoveryCodeSchema } from "@/lib/validation/vault";
import { vaultService } from "@/server/services/vault-service";
import { apiError, parseJsonBody } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const user = await requireFullyAuthenticatedUser();
    const body = await parseJsonBody(request);
    const parsed = recoveryCodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid recovery code payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await vaultService.storeRecoveryCode(user.id, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiError(error, "POST /api/recovery-code");
  }
}
