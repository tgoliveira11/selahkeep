import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { rejectPasskeyVaultForbiddenFields } from "@/server/policies/passkey-vault-plaintext-rejection";
import { passkeyLoginVaultService } from "@/server/services/passkey-login-vault-service";

const bodySchema = z.object({
  loginToken: z.string().min(1),
  credentialId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request);
    const plaintextError = rejectPasskeyVaultForbiddenFields(body);
    if (plaintextError) {
      return NextResponse.json({ error: plaintextError }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const metadata = await passkeyLoginVaultService.getVaultUnlockMetadataForLogin(
      parsed.data.loginToken,
      parsed.data.credentialId
    );
    return NextResponse.json(metadata);
  } catch (error) {
    return apiError(error, "POST /api/auth/passkey/login/vault-unlock/metadata");
  }
}
