import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";
import { requireSessionUser } from "@/lib/auth/session";
import { accountAuthService } from "@/server/services/account-auth-service";

const bodySchema = z.object({
  email: z.string().email().optional(),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await parseJsonBody(request);
    const parsed = bodySchema.safeParse(body);

    if (parsed.success && parsed.data.email) {
      const result = await accountAuthService.resendVerificationByEmail(parsed.data.email, ip);
      return NextResponse.json(result);
    }

    const session = await requireSessionUser();
    const result = await accountAuthService.sendVerificationEmailForUser(session.id, ip);
    if (result.alreadyVerified) {
      return NextResponse.json({ message: "Your email is already verified." });
    }
    return NextResponse.json({ message: "Verification email sent." });
  } catch (error) {
    return apiError(error, "POST /api/auth/verify-email/resend");
  }
}
