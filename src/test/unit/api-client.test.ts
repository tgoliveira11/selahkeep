import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient } from "@/lib/api-client/client";
import { ApiError } from "@/lib/api-client/api-error";

describe("api client", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === "/api/ok") {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        if (url === "/api/empty") {
          return new Response("", { status: 200 });
        }
        if (url === "/api/no-content") {
          return new Response(null, { status: 204 });
        }
        if (url === "/api/fail") {
          return new Response(JSON.stringify({ error: "nope" }), { status: 400 });
        }
        if (url === "/api/post" && init?.method === "POST") {
          return new Response(JSON.stringify({ created: true }), { status: 201 });
        }
        return new Response("{}", { status: 404 });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("get returns parsed JSON", async () => {
    await expect(apiClient.get<{ ok: boolean }>("/api/ok")).resolves.toEqual({ ok: true });
  });

  it("post sends JSON body", async () => {
    await expect(apiClient.post<{ created: boolean }>("/api/post", { x: 1 })).resolves.toEqual({
      created: true,
    });
  });

  it("throws ApiError on failure", async () => {
    await expect(apiClient.get("/api/fail")).rejects.toBeInstanceOf(ApiError);
  });

  it("throws on empty JSON success body", async () => {
    await expect(apiClient.get("/api/empty")).rejects.toThrow("Empty response");
  });

  it("returns undefined for 204", async () => {
    await expect(apiClient.delete("/api/no-content")).resolves.toBeUndefined();
  });

  it("put sends JSON body", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ updated: true }), { status: 200 })
    );
    await expect(apiClient.put<{ updated: boolean }>("/api/put", { x: 2 })).resolves.toEqual({
      updated: true,
    });
  });
});
