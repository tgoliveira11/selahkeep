import { NextResponse } from "next/server";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { apiError } from "@/lib/api-helpers";
import { integrationService } from "@/modules/integrations/services/integration-service";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireFullyAuthenticatedUser();
    const { id } = await params;
    const result = await integrationService.revoke(user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "DELETE /api/integrations/:id");
  }
}
