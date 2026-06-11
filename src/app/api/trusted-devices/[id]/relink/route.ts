import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { relinkTrustedDeviceSchema } from "@/lib/validation/trusted-devices";
import { trustedDeviceService } from "@/server/services/trusted-device-service";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const body = await parseJsonBody(request);
    const parsed = relinkTrustedDeviceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid trusted device relink payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);
    const device = await trustedDeviceService.relinkClientDevice(id, user.id, parsed.data, ip);
    return NextResponse.json(device);
  } catch (error) {
    return apiError(error, "POST /api/trusted-devices/:id/relink");
  }
}
