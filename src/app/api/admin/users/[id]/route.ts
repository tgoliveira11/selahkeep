import { NextResponse } from "next/server";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { adminService } from "@/server/services/admin-service";
import { apiError } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireFullyAuthenticatedUser();
    const { id } = await params;

    // MVP: users can only view their own admin summary (no cross-user admin)
    if (user.id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const summary = await adminService.getUserSummary(id);
    if (!summary) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(summary);
  } catch (error) {
    return apiError(error, "GET /api/admin/users/:id");
  }
}
