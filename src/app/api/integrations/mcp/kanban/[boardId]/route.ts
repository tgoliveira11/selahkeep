import { NextResponse } from "next/server";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { integrationService } from "@/modules/integrations/services/integration-service";
import { assertNoPlaintextKanbanFields } from "@/server/policies/kanban-plaintext-rejection";
import { updateKanbanBoardSchema } from "@/lib/validation/kanban";

type Params = { params: Promise<{ boardId: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const auth = await integrationService.authenticateToken(request);
    const { boardId } = await params;
    const board = await integrationService.getGrantedBoard(auth, boardId);
    return NextResponse.json(board);
  } catch (error) {
    return apiError(error, "GET /api/integrations/mcp/kanban/:boardId");
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const auth = await integrationService.authenticateToken(request);
    const { boardId } = await params;
    const body = await parseJsonBody(request);
    assertNoPlaintextKanbanFields(body);

    const parsed = updateKanbanBoardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid encrypted board payload" }, { status: 400 });
    }

    const board = await integrationService.updateGrantedBoard(auth, boardId, parsed.data);
    return NextResponse.json(board);
  } catch (error) {
    return apiError(error, "PUT /api/integrations/mcp/kanban/:boardId");
  }
}
