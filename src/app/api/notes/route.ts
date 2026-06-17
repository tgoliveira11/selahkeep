import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { assertNoPlaintextNoteFields } from "@/modules/security/policies/note-plaintext-rejection";
import { createNoteSchema } from "@/lib/validation/notes";
import { noteService } from "@/server/services/note-service";
import { apiError, parseJsonBody } from "@/lib/api-helpers";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const notes = await noteService.list(user.id);
    return NextResponse.json(notes);
  } catch (error) {
    return apiError(error, "GET /api/notes");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = await parseJsonBody(request);
    assertNoPlaintextNoteFields(body);

    const parsed = createNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid encrypted payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const note = await noteService.create(user.id, parsed.data);
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    return apiError(error, "POST /api/notes");
  }
}
