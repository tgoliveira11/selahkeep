import { NextResponse } from "next/server";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { integrationService } from "@/modules/integrations/services/integration-service";
import {
  assertNoIntegrationPlaintextFields,
  createIntegrationSchema,
} from "@/lib/validation/integrations";

export async function GET() {
  try {
    const user = await requireFullyAuthenticatedUser();
    const integrations = await integrationService.list(user.id);
    return NextResponse.json(integrations);
  } catch (error) {
    return apiError(error, "GET /api/integrations");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireFullyAuthenticatedUser();
    const body = await parseJsonBody(request);
    assertNoIntegrationPlaintextFields(body);

    const parsed = createIntegrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid integration request" }, { status: 400 });
    }

    const result = await integrationService.create(user.id, parsed.data.name, parsed.data.type);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiError(error, "POST /api/integrations");
  }
}
