import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";
import { passkeyLoginService } from "@/server/services/passkey-login-service";

const bodySchema = z.object({
  loginToken: z.string().min(1),
  credentialId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await passkeyLoginService.getLoginVaultUnlockOptions(
      parsed.data.loginToken,
      parsed.data.credentialId,
      getClientIp(request)
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/auth/passkey/login/vault-unlock/options");
  }
}
