import { NextResponse } from "next/server";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { integrationService } from "@/modules/integrations/services/integration-service";
import {
  assertNoIntegrationPlaintextFields,
  upsertIntegrationGrantsSchema,
} from "@/lib/validation/integrations";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireFullyAuthenticatedUser();
    const { id } = await params;
    const grants = await integrationService.listGrantsForUser(user.id, id);
    return NextResponse.json(grants);
  } catch (error) {
    return apiError(error, "GET /api/integrations/:id/grants");
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await requireFullyAuthenticatedUser();
    const { id } = await params;
    const body = await parseJsonBody(request);
    assertNoIntegrationPlaintextFields(body);

    const parsed = upsertIntegrationGrantsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid grants payload" }, { status: 400 });
    }

    const grants = await integrationService.upsertGrants(user.id, id, parsed.data);
    return NextResponse.json(grants);
  } catch (error) {
    return apiError(error, "PUT /api/integrations/:id/grants");
  }
}
