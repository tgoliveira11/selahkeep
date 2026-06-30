import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { apiError } from "@/lib/api-helpers";
import { kanbanVersionService } from "@/server/services/kanban-version-service";

type Params = { params: Promise<{ boardId: string; versionId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { boardId, versionId } = await params;
    const version = await kanbanVersionService.getById(boardId, versionId, user.id);
    return NextResponse.json(version);
  } catch (error) {
    return apiError(error, "GET /api/kanban/:boardId/versions/:versionId");
  }
}
