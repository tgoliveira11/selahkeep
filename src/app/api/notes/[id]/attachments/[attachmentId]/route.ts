import { NextResponse } from "next/server";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { apiError } from "@/lib/api-helpers";
import { enforceProductMutationRateLimit } from "@/lib/api-helpers/product-mutation-rate-limit";
import { noteAttachmentService } from "@/server/services/note-attachment-service";

type Params = { params: Promise<{ id: string; attachmentId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireFullyAuthenticatedUser();
    const { id, attachmentId } = await params;
    const attachment = await noteAttachmentService.getById(id, attachmentId, user.id);
    return NextResponse.json(attachment);
  } catch (error) {
    return apiError(error, "GET /api/notes/:id/attachments/:attachmentId");
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await requireFullyAuthenticatedUser();
    await enforceProductMutationRateLimit(request, user.id, "attachments.mutate");
    const { id, attachmentId } = await params;
    const result = await noteAttachmentService.delete(id, attachmentId, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "DELETE /api/notes/:id/attachments/:attachmentId");
  }
}
