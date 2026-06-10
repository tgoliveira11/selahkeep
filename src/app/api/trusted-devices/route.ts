import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { createTrustedDeviceSchema } from "@/lib/validation/trusted-devices";
import { trustedDeviceService } from "@/server/services/trusted-device-service";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const devices = await trustedDeviceService.list(user.id);
    return NextResponse.json(devices);
  } catch (error) {
    return apiError(error, "GET /api/trusted-devices");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = await parseJsonBody(request);
    const parsed = createTrustedDeviceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid trusted device payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);
    const device = await trustedDeviceService.create(user.id, parsed.data, ip);
    return NextResponse.json(device, { status: 201 });
  } catch (error) {
    return apiError(error, "POST /api/trusted-devices");
  }
}
