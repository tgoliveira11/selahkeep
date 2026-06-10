import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { apiError } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";
import { accountService } from "@/server/services/account-service";

export async function DELETE(request: Request) {
  try {
    const session = await requireSessionUser();
    const ip = getClientIp(request);
    await accountService.deleteAccount(session.id, ip);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, "/api/account");
  }
}
