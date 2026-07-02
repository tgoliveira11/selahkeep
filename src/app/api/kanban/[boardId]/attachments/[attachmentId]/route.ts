import { NextResponse } from "next/server";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { apiError } from "@/lib/api-helpers";
import { enforceProductMutationRateLimit } from "@/lib/api-helpers/product-mutation-rate-limit";
import { assertKanbanApiEnabled } from "@/lib/notes/kanban-api-guard";
import { noteAttachmentService } from "@/server/services/note-attachment-service";

type Params = { params: Promise<{ boardId: string; attachmentId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    assertKanbanApiEnabled();
    const user = await requireFullyAuthenticatedUser();
    const { boardId, attachmentId } = await params;
    const attachment = await noteAttachmentService.getById(
      { kind: "board", id: boardId },
      attachmentId,
      user.id
    );
    return NextResponse.json(attachment);
  } catch (error) {
    return apiError(error, "GET /api/kanban/:boardId/attachments/:attachmentId");
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    assertKanbanApiEnabled();
    const user = await requireFullyAuthenticatedUser();
    await enforceProductMutationRateLimit(request, user.id, "attachments.mutate");
    const { boardId, attachmentId } = await params;
    const result = await noteAttachmentService.delete(
      { kind: "board", id: boardId },
      attachmentId,
      user.id
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "DELETE /api/kanban/:boardId/attachments/:attachmentId");
  }
}
