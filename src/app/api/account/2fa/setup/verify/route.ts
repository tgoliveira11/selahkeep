import { NextResponse } from "next/server";
import { z } from "zod";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";
import { totpCodeSchema } from "@/lib/validation/two-factor";
import { twoFactorService } from "@/server/services/two-factor-service";

const verifySetupSchema = z.object({
  code: totpCodeSchema,
});

export async function POST(request: Request) {
  try {
    const user = await requireFullyAuthenticatedUser();
    const body = await parseJsonBody(request);
    const parsed = verifySetupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await twoFactorService.verifySetup(
      user.id,
      parsed.data.code,
      getClientIp(request)
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/account/2fa/setup/verify");
  }
}
