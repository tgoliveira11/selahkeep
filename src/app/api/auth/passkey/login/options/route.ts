import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";
import { passkeyLoginService } from "@/server/services/passkey-login-service";

const bodySchema = z.object({
  email: z.string().email().optional(),
  userId: z.string().uuid().optional(),
  credentialId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await passkeyLoginService.getLoginOptions({
      email: parsed.data.email,
      userId: parsed.data.userId,
      credentialId: parsed.data.credentialId,
      ip: getClientIp(request),
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/auth/passkey/login/options");
  }
}
