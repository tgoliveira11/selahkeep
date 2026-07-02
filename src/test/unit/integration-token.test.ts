import { describe, expect, it } from "vitest";
import {
  generateIntegrationToken,
  hashIntegrationToken,
  extractBearerToken,
} from "@/lib/integrations/integration-token";

describe("integration token", () => {
  it("generates sk_int prefix tokens", () => {
    const { token, tokenHash, tokenPrefix } = generateIntegrationToken();
    expect(token.startsWith("sk_int_")).toBe(true);
    expect(tokenHash).toBe(hashIntegrationToken(token));
    expect(tokenPrefix).toBe(token.slice(0, 12));
  });

  it("extracts bearer token", () => {
    const request = new Request("http://localhost", {
      headers: { Authorization: "Bearer sk_int_abc" },
    });
    expect(extractBearerToken(request)).toBe("sk_int_abc");
  });
});
