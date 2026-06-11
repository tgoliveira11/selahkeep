import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";
import { passkeyLoginService } from "@/server/services/passkey-login-service";

const bodySchema = z.object({
  response: z.unknown(),
});

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success || !parsed.data.response) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await passkeyLoginService.verifyLogin(
      parsed.data.response as Parameters<typeof passkeyLoginService.verifyLogin>[0],
      getClientIp(request)
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/auth/passkey/login/verify");
  }
}
