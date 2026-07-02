import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-helpers";
import { integrationService } from "@/modules/integrations/services/integration-service";

export async function GET(request: Request) {
  try {
    const auth = await integrationService.authenticateToken(request);
    const notes = await integrationService.listGrantedNotes(auth);
    return NextResponse.json(notes);
  } catch (error) {
    return apiError(error, "GET /api/integrations/mcp/notes");
  }
}
