import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { assertNoPlaintextFields } from "@/server/policies/plaintext-rejection";
import { updateLetterSchema } from "@/lib/validation/letters";
import { letterService } from "@/server/services/letter-service";
import { apiError, parseJsonBody } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const letter = await letterService.getById(id, user.id);
    return NextResponse.json(letter);
  } catch (error) {
    return apiError(error, "GET /api/letters/:id");
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const body = await parseJsonBody(request);
    assertNoPlaintextFields(body);

    const parsed = updateLetterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid encrypted payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const letter = await letterService.update(id, user.id, parsed.data);
    return NextResponse.json(letter);
  } catch (error) {
    return apiError(error, "PUT /api/letters/:id");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const result = await letterService.delete(id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "DELETE /api/letters/:id");
  }
}
