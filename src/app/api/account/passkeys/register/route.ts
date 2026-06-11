import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth/session";
import { passkeyAccountService } from "@/server/services/passkey-account-service";
import { encryptedPayloadSchema } from "@/lib/validation/encrypted-payload";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";

const bodySchema = z.object({
  action: z.enum(["options", "verify"]),
  response: z.unknown().optional(),
  friendlyName: z.string().max(120).optional(),
  encryptedVaultKey: encryptedPayloadSchema.optional(),
  prfVaultEnvelope: z.literal(true).optional(),
  prfSupported: z.boolean().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = await parseJsonBody(request);
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const ip = getClientIp(request);

    if (parsed.data.action === "options") {
      const options = await passkeyAccountService.getRegistrationOptions(user.id, user.email, ip);
      return NextResponse.json(options);
    }

    if (!parsed.data.response) {
      return NextResponse.json({ error: "Missing registration response" }, { status: 400 });
    }

    const result = await passkeyAccountService.verifyRegistration(
      user.id,
      parsed.data.response as Parameters<typeof passkeyAccountService.verifyRegistration>[1],
      {
        friendlyName: parsed.data.friendlyName,
        encryptedVaultKey: parsed.data.encryptedVaultKey,
        prfVaultEnvelope: parsed.data.prfVaultEnvelope,
        prfSupported: parsed.data.prfSupported,
      }
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/account/passkeys/register");
  }
}
