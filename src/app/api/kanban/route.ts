import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import {
  createKanbanBoardSchema,
  listKanbanBoardsQuerySchema,
} from "@/lib/validation/kanban";
import { kanbanService } from "@/server/services/kanban-service";
import { assertNoPlaintextKanbanFields } from "@/server/policies/kanban-plaintext-rejection";

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    const url = new URL(request.url);
    const query: Record<string, string> = {};
    const noteId = url.searchParams.get("noteId");
    const scope = url.searchParams.get("scope");
    if (noteId) query.noteId = noteId;
    if (scope) query.scope = scope;
    const parsed = listKanbanBoardsQuerySchema.safeParse(query);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid kanban query", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const boards = await kanbanService.list(user.id, parsed.data);
    return NextResponse.json(boards);
  } catch (error) {
    return apiError(error, "GET /api/kanban");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = await parseJsonBody(request);
    assertNoPlaintextKanbanFields(body);

    const parsed = createKanbanBoardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid encrypted kanban payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const board = await kanbanService.create(user.id, parsed.data);
    return NextResponse.json(board, { status: 201 });
  } catch (error) {
    return apiError(error, "POST /api/kanban");
  }
}
