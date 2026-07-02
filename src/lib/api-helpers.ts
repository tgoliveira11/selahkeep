import { NextResponse } from "next/server";
import { PlaintextRejectionError } from "@/server/policies/plaintext-rejection";
import { AadValidationError } from "@/server/policies/aad-validation";
import { UnauthorizedError } from "@/lib/auth/session";
import { safeLogger } from "@/lib/logger";

export function apiError(error: unknown, endpoint: string) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof PlaintextRejectionError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof AadValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error && typeof error === "object" && "name" in error) {
    const named = error as { name: string; message: string };
    if (named.name === "NotFoundError") {
      return NextResponse.json({ error: named.message }, { status: 404 });
    }
    if (named.name === "ConflictError") {
      return NextResponse.json({ error: named.message }, { status: 409 });
    }
    if (named.name === "RateLimitError") {
      return NextResponse.json({ error: named.message }, { status: 429 });
    }
    if (named.name === "RateLimitStoreUnavailableError") {
      return NextResponse.json({ error: named.message }, { status: 503 });
    }
    if (named.name === "ChallengeError") {
      return NextResponse.json({ error: named.message }, { status: 400 });
    }
    if (named.name === "ValidationError") {
      return NextResponse.json({ error: named.message }, { status: 400 });
    }
    if (named.name === "ReauthenticationRequiredError") {
      return NextResponse.json({ error: named.message }, { status: 401 });
    }
    if (named.name === "VersionsUnavailableError") {
      return NextResponse.json({ error: named.message }, { status: 503 });
    }
    if (named.name === "AttachmentsUnavailableError") {
      return NextResponse.json({ error: named.message }, { status: 503 });
    }
    if (named.name === "KanbanUnavailableError") {
      return NextResponse.json({ error: named.message }, { status: 503 });
    }
    if (named.name === "KanbanVersionsUnavailableError") {
      return NextResponse.json({ error: named.message }, { status: 503 });
    }
    if (named.name === "KanbanDisabledError") {
      return NextResponse.json({ error: named.message }, { status: 404 });
    }
    if (named.name === "VaultPlaintextRejectionError") {
      return NextResponse.json({ error: named.message }, { status: 400 });
    }
    if (named.name === "AdminForbiddenError") {
      return NextResponse.json({ error: named.message }, { status: 403 });
    }
  }
  safeLogger.error("API error", { endpoint, error: error instanceof Error ? error.message : "unknown" });
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function parseJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}
