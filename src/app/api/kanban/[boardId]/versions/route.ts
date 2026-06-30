import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { createKanbanVersionSchema } from "@/lib/validation/kanban";
import { kanbanVersionService } from "@/server/services/kanban-version-service";
import { assertNoPlaintextKanbanFields } from "@/server/policies/kanban-plaintext-rejection";

type Params = { params: Promise<{ boardId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { boardId } = await params;
    const versions = await kanbanVersionService.list(boardId, user.id);
    return NextResponse.json(versions);
  } catch (error) {
    return apiError(error, "GET /api/kanban/:boardId/versions");
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireSessionUser();
    const { boardId } = await params;
    const body = await parseJsonBody(request);
    assertNoPlaintextKanbanFields(body);

    const parsed = createKanbanVersionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid encrypted kanban version payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const version = await kanbanVersionService.create(boardId, user.id, parsed.data);
    return NextResponse.json(version, { status: 201 });
  } catch (error) {
    return apiError(error, "POST /api/kanban/:boardId/versions");
  }
}
