import { describe, it, expect } from "vitest";
import { getErrorMessage, parseJsonResponse } from "@/lib/api-client/parse-response";

describe("parse response helpers", () => {
  it("parseJsonResponse parses JSON bodies", async () => {
    const res = new Response(JSON.stringify({ hello: "world" }), { status: 200 });
    await expect(parseJsonResponse(res)).resolves.toEqual({ hello: "world" });
  });

  it("parseJsonResponse returns null for empty bodies", async () => {
    const res = new Response("", { status: 200 });
    await expect(parseJsonResponse(res)).resolves.toBeNull();
  });

  it("parseJsonResponse returns null for invalid JSON", async () => {
    const res = new Response("not-json", { status: 200 });
    await expect(parseJsonResponse(res)).resolves.toBeNull();
  });

  it("getErrorMessage prefers API error field", async () => {
    const res = new Response(JSON.stringify({ error: "Bad request" }), { status: 400 });
    await expect(getErrorMessage(res)).resolves.toBe("Bad request");
  });

  it("getErrorMessage returns migration hint for 500", async () => {
    const res = new Response("", { status: 500 });
    const message = await getErrorMessage(res);
    expect(message).toContain("PostgreSQL");
  });

  it("getErrorMessage falls back to status text", async () => {
    const res = new Response("{}", { status: 418, statusText: "Teapot" });
    await expect(getErrorMessage(res, "Failed")).resolves.toBe("Failed (418)");
  });
});
