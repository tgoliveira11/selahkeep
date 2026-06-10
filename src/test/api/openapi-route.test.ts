import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/openapi/route";

describe("GET /api/openapi", () => {
  it("returns OpenAPI 3 spec with core paths", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const spec = await response.json();
    expect(spec.openapi).toMatch(/^3\.0/);
    expect(spec.info.title).toContain("Letters to God");
    expect(spec.paths["/api/letters"]).toBeDefined();
    expect(spec.paths["/api/vault/status"]).toBeDefined();
    expect(spec.components.schemas.EncryptedPayload).toBeDefined();
  });
});
