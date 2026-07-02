import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-helpers";
import { integrationService } from "@/modules/integrations/services/integration-service";

export async function GET(request: Request) {
  try {
    const auth = await integrationService.authenticateToken(request);
    const boards = await integrationService.listGrantedBoards(auth);
    return NextResponse.json(boards);
  } catch (error) {
    return apiError(error, "GET /api/integrations/mcp/kanban");
  }
}
