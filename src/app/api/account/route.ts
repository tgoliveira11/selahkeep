import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";
import { accountService } from "@/server/services/account-service";
import {
  assertAuthPasswordRequestMethod,
  assertPasswordNotInUrl,
  AuthPasswordTransportError,
} from "@/server/policies/auth-password-input";
import { z } from "zod";

const deleteSchema = z.object({
  confirmationPhrase: z.string(),
  password: z.string().optional(),
});

export async function GET() {
  try {
    const session = await requireSessionUser();
    const requirements = await accountService.getDeletionRequirements(session.id);
    return NextResponse.json(requirements);
  } catch (error) {
    return apiError(error, "GET /api/account");
  }
}

export async function DELETE(request: Request) {
  try {
    assertAuthPasswordRequestMethod(request.method, new Set(["DELETE"]));
    assertPasswordNotInUrl(request.url);

    const session = await requireSessionUser();
    const ip = getClientIp(request);
    const body = await parseJsonBody(request);
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await accountService.deleteAccount(session.id, parsed.data, ip);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthPasswordTransportError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return apiError(error, "DELETE /api/account");
  }
}
