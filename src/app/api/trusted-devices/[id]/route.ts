import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { updateTrustedDeviceSchema } from "@/lib/validation/trusted-devices";
import { trustedDeviceService } from "@/server/services/trusted-device-service";
import { apiError, parseJsonBody } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const body = await parseJsonBody(request);
    const parsed = updateTrustedDeviceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid trusted device payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const device = await trustedDeviceService.rename(id, user.id, parsed.data.deviceName);
    return NextResponse.json(device);
  } catch (error) {
    return apiError(error, "PATCH /api/trusted-devices/:id");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const result = await trustedDeviceService.revoke(id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "DELETE /api/trusted-devices/:id");
  }
}
