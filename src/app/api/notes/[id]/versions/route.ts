import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { assertNoPlaintextNoteFields } from "@/modules/security/policies/note-plaintext-rejection";
import { createNoteVersionSchema } from "@/lib/validation/note-versions";
import { noteVersionService } from "@/server/services/note-version-service";
import { apiError, parseJsonBody } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const versions = await noteVersionService.list(id, user.id);
    return NextResponse.json(versions);
  } catch (error) {
    return apiError(error, "GET /api/notes/:id/versions");
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const body = await parseJsonBody(request);
    assertNoPlaintextNoteFields(body);

    const parsed = createNoteVersionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid encrypted payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const version = await noteVersionService.create(id, user.id, parsed.data);
    return NextResponse.json(version, { status: 201 });
  } catch (error) {
    return apiError(error, "POST /api/notes/:id/versions");
  }
}
