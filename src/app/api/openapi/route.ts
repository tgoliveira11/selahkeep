import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";
import { parse } from "yaml";
import { isApiDocsEnabled } from "@/lib/api-docs-access";

let cachedSpec: unknown | null = null;

export async function GET() {
  if (!isApiDocsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    if (!cachedSpec) {
      const specPath = join(process.cwd(), "docs/openapi.yaml");
      cachedSpec = parse(readFileSync(specPath, "utf8"));
    }
    return NextResponse.json(cachedSpec);
  } catch {
    return NextResponse.json({ error: "OpenAPI spec unavailable" }, { status: 500 });
  }
}
