import { NextResponse } from "next/server";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { passkeyService } from "@/server/services/passkey-service";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";
import { readVaultDeviceBindingIdFromCookies } from "@/lib/passkey/vault-device-binding-cookie";
import { z } from "zod";

const authSchema = z.object({
  action: z.enum(["options", "verify"]),
  purpose: z.literal("vault_unlock").optional(),
  response: z.unknown().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireFullyAuthenticatedUser();
    const body = await parseJsonBody(request);
    const parsed = authSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const ip = getClientIp(request);
    const deviceBindingId = await readVaultDeviceBindingIdFromCookies();

    const purpose = parsed.data.purpose;
    const authOptions = purpose ? { purpose, deviceBindingId } : undefined;

    if (parsed.data.action === "options") {
      const options = await passkeyService.getAuthenticationOptions(user.id, ip, authOptions);
      return NextResponse.json(options);
    }

    if (!parsed.data.response) {
      return NextResponse.json({ error: "Missing authentication response" }, { status: 400 });
    }

    const result = await passkeyService.verifyAuthentication(
      user.id,
      parsed.data.response as Parameters<typeof passkeyService.verifyAuthentication>[1],
      authOptions
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/passkeys/authenticate");
  }
}
