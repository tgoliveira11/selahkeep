import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { apiError } from "@/lib/api-helpers";
import { noteAttachmentService } from "@/server/services/note-attachment-service";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const usage = await noteAttachmentService.getStorageUsage(user.id);
    return NextResponse.json(usage);
  } catch (error) {
    return apiError(error, "GET /api/vault/storage-usage");
  }
}
