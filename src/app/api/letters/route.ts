import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { assertNoPlaintextFields } from "@/server/policies/plaintext-rejection";
import { createLetterSchema } from "@/lib/validation/letters";
import { letterService } from "@/server/services/letter-service";
import { apiError, parseJsonBody } from "@/lib/api-helpers";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const letters = await letterService.list(user.id);
    return NextResponse.json(letters);
  } catch (error) {
    return apiError(error, "GET /api/letters");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = await parseJsonBody(request);
    assertNoPlaintextFields(body);

    const parsed = createLetterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid encrypted payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const letter = await letterService.create(user.id, parsed.data);
    return NextResponse.json(letter, { status: 201 });
  } catch (error) {
    return apiError(error, "POST /api/letters");
  }
}
