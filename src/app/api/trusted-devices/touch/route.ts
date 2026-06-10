import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { touchTrustedDeviceSchema } from "@/lib/validation/trusted-devices";
import { trustedDeviceService } from "@/server/services/trusted-device-service";
import { apiError, parseJsonBody } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = await parseJsonBody(request);
    const parsed = touchTrustedDeviceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid touch payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await trustedDeviceService.touchLastUsed(user.id, parsed.data.deviceId);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/trusted-devices/touch");
  }
}
