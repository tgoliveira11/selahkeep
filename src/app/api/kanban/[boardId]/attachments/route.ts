import { NextResponse } from "next/server";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { enforceProductMutationRateLimit } from "@/lib/api-helpers/product-mutation-rate-limit";
import { assertKanbanApiEnabled } from "@/lib/notes/kanban-api-guard";
import { noteAttachmentService } from "@/server/services/note-attachment-service";
import { createAttachmentSchema, rejectPlaintextAttachmentFields } from "@/lib/validation/note-attachments";
import { PlaintextRejectionError } from "@/modules/security/policies/plaintext-rejection";

type Params = { params: Promise<{ boardId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    assertKanbanApiEnabled();
    const user = await requireFullyAuthenticatedUser();
    const { boardId } = await params;
    const attachments = await noteAttachmentService.list({ kind: "board", id: boardId }, user.id);
    return NextResponse.json({ attachments });
  } catch (error) {
    return apiError(error, "GET /api/kanban/:boardId/attachments");
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    assertKanbanApiEnabled();
    const user = await requireFullyAuthenticatedUser();
    await enforceProductMutationRateLimit(request, user.id, "attachments.mutate");
    const { boardId } = await params;
    const body = await parseJsonBody(request);
    const plaintextError = rejectPlaintextAttachmentFields(body);
    if (plaintextError) throw new PlaintextRejectionError(plaintextError);

    const parsed = createAttachmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid encrypted payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const attachment = await noteAttachmentService.create(
      { kind: "board", id: boardId },
      user.id,
      parsed.data
    );
    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    return apiError(error, "POST /api/kanban/:boardId/attachments");
  }
}
