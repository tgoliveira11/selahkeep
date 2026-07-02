import { NextResponse } from "next/server";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { integrationService } from "@/modules/integrations/services/integration-service";
import { assertNoPlaintextNoteFields } from "@/modules/security/policies/note-plaintext-rejection";
import { updateNoteSchema } from "@/lib/validation/notes";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const auth = await integrationService.authenticateToken(request);
    const { id } = await params;
    const note = await integrationService.getGrantedNote(auth, id);
    return NextResponse.json(note);
  } catch (error) {
    return apiError(error, "GET /api/integrations/mcp/notes/:id");
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const auth = await integrationService.authenticateToken(request);
    const { id } = await params;
    const body = await parseJsonBody(request);
    assertNoPlaintextNoteFields(body);

    const parsed = updateNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid encrypted note payload" }, { status: 400 });
    }

    const note = await integrationService.updateGrantedNote(auth, id, parsed.data);
    return NextResponse.json(note);
  } catch (error) {
    return apiError(error, "PUT /api/integrations/mcp/notes/:id");
  }
}
