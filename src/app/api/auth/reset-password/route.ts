import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import {
  assertAuthPasswordRequestMethod,
  assertPasswordNotInUrl,
  AuthPasswordTransportError,
} from "@/server/policies/auth-password-input";
import { getClientIp } from "@/lib/request-ip";
import { accountAuthService } from "@/server/services/account-auth-service";

const validateSchema = z.object({
  action: z.literal("validate"),
  token: z.string().min(1),
});

const resetSchema = z.object({
  action: z.literal("reset"),
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const bodySchema = z.discriminatedUnion("action", [validateSchema, resetSchema]);

export async function POST(request: Request) {
  try {
    assertAuthPasswordRequestMethod(request.method, new Set(["POST"]));
    assertPasswordNotInUrl(request.url);

    const body = await parseJsonBody(request);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (parsed.data.action === "validate") {
      const result = await accountAuthService.validatePasswordResetToken(parsed.data.token);
      return NextResponse.json(result);
    }

    const result = await accountAuthService.resetPassword(
      parsed.data.token,
      parsed.data.newPassword,
      getClientIp(request)
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthPasswordTransportError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return apiError(error, "POST /api/auth/reset-password");
  }
}
