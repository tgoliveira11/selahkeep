import { NextResponse } from "next/server";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { noteVersionService } from "@/server/services/note-version-service";
import { apiError } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string; versionId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireFullyAuthenticatedUser();
    const { id, versionId } = await params;
    const version = await noteVersionService.getById(id, versionId, user.id);
    return NextResponse.json(version);
  } catch (error) {
    return apiError(error, "GET /api/notes/:id/versions/:versionId");
  }
}
