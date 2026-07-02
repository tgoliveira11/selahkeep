import { NextResponse } from "next/server";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { recoveryPhraseReplaceSchema, assertNoVaultPlaintextFields } from "@/lib/validation/vault";
import { vaultService } from "@/server/services/vault-service";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { VaultPlaintextRejectionError } from "@/lib/validation/vault";
import { vaultApiClientKey, vaultApiRateLimitResponse } from "@/lib/vault/vault-api-guard";

export async function POST(request: Request) {
  try {
    const user = await requireFullyAuthenticatedUser();
    const limited = vaultApiRateLimitResponse(
      "vault-recovery-phrase",
      vaultApiClientKey(request, user.id)
    );
    if (limited) return limited;

    const body = (await parseJsonBody(request)) as Record<string, unknown>;
    assertNoVaultPlaintextFields(body);

    const parsed = recoveryPhraseReplaceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid recovery phrase payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await vaultService.replaceRecoveryPhrase(user.id, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof VaultPlaintextRejectionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error, "POST /api/vault/recovery-phrase");
  }
}
