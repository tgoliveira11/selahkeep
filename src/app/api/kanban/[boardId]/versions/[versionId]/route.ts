import { NextResponse } from "next/server";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { apiError } from "@/lib/api-helpers";
import { assertKanbanApiEnabled } from "@/lib/notes/kanban-api-guard";
import { kanbanVersionService } from "@/server/services/kanban-version-service";

type Params = { params: Promise<{ boardId: string; versionId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    assertKanbanApiEnabled();
    const user = await requireFullyAuthenticatedUser();
    const { boardId, versionId } = await params;
    const version = await kanbanVersionService.getById(boardId, versionId, user.id);
    return NextResponse.json(version);
  } catch (error) {
    return apiError(error, "GET /api/kanban/:boardId/versions/:versionId");
  }
}
