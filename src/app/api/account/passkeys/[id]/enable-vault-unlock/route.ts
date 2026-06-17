import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth/session";
import { passkeyVaultEnvelopeService } from "@/server/services/passkey-vault-envelope-service";
import { encryptedPayloadSchema } from "@/lib/validation/encrypted-payload";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";
import { rejectPasskeyVaultForbiddenFields } from "@/server/policies/passkey-vault-plaintext-rejection";

const bodySchema = z.object({
  action: z.enum(["options", "verify"]),
  response: z.unknown().optional(),
  encryptedVaultKey: encryptedPayloadSchema.optional(),
  prfVaultEnvelope: z.literal(true).optional(),
  prfSupported: z.boolean().nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireSessionUser();
    const { id } = await context.params;
    const body = await parseJsonBody(request);
    const plaintextError = rejectPasskeyVaultForbiddenFields(body);
    if (plaintextError) {
      return NextResponse.json({ error: plaintextError }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const ip = getClientIp(request);

    if (parsed.data.action === "options") {
      const options = await passkeyVaultEnvelopeService.getVaultUnlockAuthOptions(user.id, id, ip);
      return NextResponse.json(options);
    }

    if (!parsed.data.response || !parsed.data.encryptedVaultKey) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await passkeyVaultEnvelopeService.enableVaultUnlock(
      user.id,
      id,
      parsed.data.response as Parameters<typeof passkeyVaultEnvelopeService.enableVaultUnlock>[2],
      parsed.data.encryptedVaultKey,
      {
        prfVaultEnvelope: parsed.data.prfVaultEnvelope,
        prfSupported: parsed.data.prfSupported,
      }
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/account/passkeys/:id/enable-vault-unlock");
  }
}
