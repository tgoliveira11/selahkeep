import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { trustedDeviceService } from "@/server/services/trusted-device-service";
import { apiError } from "@/lib/api-helpers";
import { z } from "zod";

const querySchema = z.object({
  deviceId: z.string().uuid(),
});

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({ deviceId: url.searchParams.get("deviceId") });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid deviceId" }, { status: 400 });
    }

    const result = await trustedDeviceService.getClientDeviceState(user.id, parsed.data.deviceId);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "GET /api/trusted-devices/status");
  }
}
