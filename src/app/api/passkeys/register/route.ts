import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { passkeyService } from "@/server/services/passkey-service";
import { encryptedPayloadSchema } from "@/lib/validation/encrypted-payload";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { z } from "zod";

const verifySchema = z.object({
  action: z.enum(["options", "verify"]),
  response: z.unknown().optional(),
  encryptedVaultKey: encryptedPayloadSchema.optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = await parseJsonBody(request);
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (parsed.data.action === "options") {
      const options = await passkeyService.getRegistrationOptions(user.id, user.email);
      return NextResponse.json(options);
    }

    if (!parsed.data.response) {
      return NextResponse.json({ error: "Missing registration response" }, { status: 400 });
    }

    const result = await passkeyService.verifyRegistration(
      user.id,
      parsed.data.response as Parameters<typeof passkeyService.verifyRegistration>[1],
      parsed.data.encryptedVaultKey
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/passkeys/register");
  }
}
