import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/notes/[id]/versions/route";
import { GET as GET_ONE } from "@/app/api/notes/[id]/versions/[versionId]/route";
import { createNoteVersionInput, NOTE_ID, USER_ID, VERSION_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  requireSessionUser: vi.fn(),
  create: vi.fn(),
  list: vi.fn(),
  getById: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: mocks.requireSessionUser,
  UnauthorizedError: class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  },
}));

vi.mock("@/server/services/note-version-service", () => ({
  noteVersionService: {
    create: mocks.create,
    list: mocks.list,
    getById: mocks.getById,
  },
  NotFoundError: class NotFoundError extends Error {
    name = "NotFoundError";
  },
  VersionsUnavailableError: class VersionsUnavailableError extends Error {
    name = "VersionsUnavailableError";
  },
}));

function jsonRequest(body: unknown, method = "POST") {
  return new Request("http://localhost", { method, body: JSON.stringify(body) });
}

describe("note versions API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSessionUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
  });

  it("GET lists versions", async () => {
    mocks.list.mockResolvedValue([{ id: VERSION_ID, versionNumber: 1 }]);
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: NOTE_ID }),
    });
    expect(res.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith(NOTE_ID, USER_ID);
  });

  it("POST creates a version", async () => {
    mocks.create.mockResolvedValue({ id: VERSION_ID, versionNumber: 1 });
    const res = await POST(jsonRequest(createNoteVersionInput()), {
      params: Promise.resolve({ id: NOTE_ID }),
    });
    expect(res.status).toBe(201);
  });

  it("POST rejects plaintext fields", async () => {
    const res = await POST(jsonRequest({ body: "plaintext" }), {
      params: Promise.resolve({ id: NOTE_ID }),
    });
    expect(res.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("POST rejects malformed encrypted payload", async () => {
    const res = await POST(jsonRequest({ id: "not-a-uuid" }), {
      params: Promise.resolve({ id: NOTE_ID }),
    });
    expect(res.status).toBe(400);
  });

  it("GET one version returns it", async () => {
    mocks.getById.mockResolvedValue({ id: VERSION_ID });
    const res = await GET_ONE(new Request("http://localhost"), {
      params: Promise.resolve({ id: NOTE_ID, versionId: VERSION_ID }),
    });
    expect(res.status).toBe(200);
    expect(mocks.getById).toHaveBeenCalledWith(NOTE_ID, VERSION_ID, USER_ID);
  });

  it("POST returns 503 when the versions table is unavailable", async () => {
    const { VersionsUnavailableError } = await import(
      "@/server/services/note-version-service"
    );
    mocks.create.mockRejectedValue(new VersionsUnavailableError("unavailable"));
    const res = await POST(jsonRequest(createNoteVersionInput()), {
      params: Promise.resolve({ id: NOTE_ID }),
    });
    expect(res.status).toBe(503);
  });

  it("GET one version returns 404 when missing", async () => {
    const { NotFoundError } = await import("@/server/services/note-version-service");
    mocks.getById.mockRejectedValue(new NotFoundError("Version not found"));
    const res = await GET_ONE(new Request("http://localhost"), {
      params: Promise.resolve({ id: NOTE_ID, versionId: VERSION_ID }),
    });
    expect(res.status).toBe(404);
  });
});
