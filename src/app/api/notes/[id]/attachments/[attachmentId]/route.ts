import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { apiError } from "@/lib/api-helpers";
import { noteAttachmentService } from "@/server/services/note-attachment-service";

type Params = { params: Promise<{ id: string; attachmentId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id, attachmentId } = await params;
    const attachment = await noteAttachmentService.getById(id, attachmentId, user.id);
    return NextResponse.json(attachment);
  } catch (error) {
    return apiError(error, "GET /api/notes/:id/attachments/:attachmentId");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { id, attachmentId } = await params;
    const result = await noteAttachmentService.delete(id, attachmentId, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "DELETE /api/notes/:id/attachments/:attachmentId");
  }
}
