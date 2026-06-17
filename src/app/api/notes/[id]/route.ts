import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { assertNoPlaintextNoteFields } from "@/modules/security/policies/note-plaintext-rejection";
import { updateNoteSchema } from "@/lib/validation/notes";
import { noteService } from "@/server/services/note-service";
import { apiError, parseJsonBody } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const note = await noteService.getById(id, user.id);
    return NextResponse.json(note);
  } catch (error) {
    return apiError(error, "GET /api/notes/:id");
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const body = await parseJsonBody(request);
    assertNoPlaintextNoteFields(body);

    const parsed = updateNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid encrypted payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const note = await noteService.update(id, user.id, parsed.data);
    return NextResponse.json(note);
  } catch (error) {
    return apiError(error, "PUT /api/notes/:id");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id } = await params;
    const result = await noteService.delete(id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "DELETE /api/notes/:id");
  }
}
