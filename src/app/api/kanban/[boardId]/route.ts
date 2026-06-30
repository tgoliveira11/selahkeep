import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { updateKanbanBoardSchema } from "@/lib/validation/kanban";
import { kanbanService } from "@/server/services/kanban-service";
import { assertNoPlaintextKanbanFields } from "@/server/policies/kanban-plaintext-rejection";

type Params = { params: Promise<{ boardId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { boardId } = await params;
    const board = await kanbanService.getById(boardId, user.id);
    return NextResponse.json(board);
  } catch (error) {
    return apiError(error, "GET /api/kanban/:boardId");
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { boardId } = await params;
    const body = await parseJsonBody(request);
    assertNoPlaintextKanbanFields(body);

    const parsed = updateKanbanBoardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid encrypted kanban payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const board = await kanbanService.update(boardId, user.id, parsed.data);
    return NextResponse.json(board);
  } catch (error) {
    return apiError(error, "PUT /api/kanban/:boardId");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { boardId } = await params;
    const result = await kanbanService.delete(boardId, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "DELETE /api/kanban/:boardId");
  }
}
