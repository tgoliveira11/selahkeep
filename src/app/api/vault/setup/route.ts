import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { vaultSetupSchema, assertNoVaultPlaintextFields } from "@/lib/validation/vault";
import { vaultService } from "@/server/services/vault-service";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { VaultPlaintextRejectionError } from "@/lib/validation/vault";

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await parseJsonBody(request)) as Record<string, unknown>;
    assertNoVaultPlaintextFields(body);

    const parsed = vaultSetupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid vault setup payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const vault = await vaultService.setup(user.id, parsed.data);
    return NextResponse.json(vault, { status: 201 });
  } catch (error) {
    if (error instanceof VaultPlaintextRejectionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error, "POST /api/vault/setup");
  }
}
