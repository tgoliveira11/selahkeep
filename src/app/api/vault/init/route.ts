import { NextResponse } from "next/server";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { apiError } from "@/lib/api-helpers";

/** @deprecated Use POST /api/vault/setup — legacy init accepted weak KDF/plaintext and is removed. */
export async function POST(request: Request) {
  try {
    await requireFullyAuthenticatedUser();
    void request;
    return NextResponse.json(
      {
        error: "POST /api/vault/init is deprecated. Use POST /api/vault/setup instead.",
        deprecated: true,
      },
      { status: 410 }
    );
  } catch (error) {
    return apiError(error, "POST /api/vault/init");
  }
}
