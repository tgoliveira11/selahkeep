import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import {
  vaultUnlockEnvelopeRequestSchema,
  assertNoVaultPlaintextFields,
  VaultPlaintextRejectionError,
} from "@/lib/validation/vault";
import { vaultService } from "@/server/services/vault-service";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";

import { vaultApiClientKey, vaultApiRateLimitResponse } from "@/lib/vault/vault-api-guard";

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const limited = vaultApiRateLimitResponse(
      "vault-unlock-envelope",
      vaultApiClientKey(request, user.id)
    );
    if (limited) return limited;

    const body = (await parseJsonBody(request)) as Record<string, unknown>;
    assertNoVaultPlaintextFields(body);

    const parsed = vaultUnlockEnvelopeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid unlock envelope request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);
    const envelope = await vaultService.getUnlockEnvelope(user.id, parsed.data.method, ip);
    return NextResponse.json(envelope);
  } catch (error) {
    if (error instanceof VaultPlaintextRejectionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error, "POST /api/vault/unlock-envelope");
  }
}
