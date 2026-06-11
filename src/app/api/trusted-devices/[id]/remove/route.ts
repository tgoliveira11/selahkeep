import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { trustedDeviceService } from "@/server/services/trusted-device-service";
import { apiError } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const result = await trustedDeviceService.removeRevoked(id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/trusted-devices/:id/remove");
  }
}
