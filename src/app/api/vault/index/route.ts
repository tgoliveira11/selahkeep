import { NextResponse } from "next/server";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { rejectVaultPlaintextFields } from "@/lib/validation/vault";
import { encryptedPayloadSchema } from "@/lib/validation/encrypted-payload";
import { vaultService } from "@/server/services/vault-service";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { PlaintextRejectionError } from "@/modules/security/policies/plaintext-rejection";

export async function GET() {
  try {
    const user = await requireFullyAuthenticatedUser();
    const index = await vaultService.getIndex(user.id);
    return NextResponse.json(index);
  } catch (error) {
    return apiError(error, "GET /api/vault/index");
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireFullyAuthenticatedUser();
    const body = await parseJsonBody(request);

    const vaultPlaintextError = rejectVaultPlaintextFields(body);
    if (vaultPlaintextError) {
      throw new PlaintextRejectionError(vaultPlaintextError);
    }

    const parsed = encryptedPayloadSchema.safeParse(body.encryptedVaultIndex);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid encrypted vault index", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await vaultService.updateIndex(user.id, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "PATCH /api/vault/index");
  }
}
