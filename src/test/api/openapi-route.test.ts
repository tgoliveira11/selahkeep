import { describe, it, expect, vi, afterEach } from "vitest";
import { GET } from "@/app/api/openapi/route";

describe("GET /api/openapi", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns OpenAPI 3 spec with core paths when docs are enabled", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = await GET();
    expect(response.status).toBe(200);
    const spec = await response.json();
    expect(spec.openapi).toMatch(/^3\.0/);
    expect(spec.info.title).toContain("SelahKeep");
    expect(spec.paths["/api/notes"]).toBeDefined();
    expect(spec.paths["/api/vault/settings"]).toBeDefined();
    expect(spec.paths["/api/vault/status"]).toBeDefined();
    expect(spec.components.schemas.EncryptedPayload).toBeDefined();
  });

  it("returns 404 in production when ENABLE_API_DOCS is not set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_API_DOCS", "");
    const response = await GET();
    expect(response.status).toBe(404);
  });
});
