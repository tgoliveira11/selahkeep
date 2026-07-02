import { describe, it, expect, vi, beforeEach } from "vitest";
import { USER_ID, NOTE_ID, BOARD_ID, encryptedPayload } from "@/test/helpers/fixtures";

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...actual,
    requireFullyAuthenticatedUser: vi.fn(async () => ({ id: USER_ID })),
  };
});

const createMock = vi.fn();
const listMock = vi.fn();
const revokeMock = vi.fn();
const listGrantsMock = vi.fn();
const upsertGrantsMock = vi.fn();
const authenticateTokenMock = vi.fn();
const listGrantedNotesMock = vi.fn();
const getGrantedNoteMock = vi.fn();
const updateGrantedNoteMock = vi.fn();

const listGrantedBoardsMock = vi.fn();
const getGrantedBoardMock = vi.fn();
const updateGrantedBoardMock = vi.fn();

vi.mock("@/modules/integrations/services/integration-service", () => ({
  integrationService: {
    create: createMock,
    list: listMock,
    revoke: revokeMock,
    listGrantsForUser: listGrantsMock,
    upsertGrants: upsertGrantsMock,
    authenticateToken: authenticateTokenMock,
    listGrantedNotes: listGrantedNotesMock,
    getGrantedNote: getGrantedNoteMock,
    updateGrantedNote: updateGrantedNoteMock,
    listGrantedBoards: listGrantedBoardsMock,
    getGrantedBoard: getGrantedBoardMock,
    updateGrantedBoard: updateGrantedBoardMock,
  },
}));

const INTEGRATION_ID = "6ba26317-e15f-4818-ac44-1a46351c0638";

describe("integrations API routes", () => {
  beforeEach(() => {
    vi.stubEnv("INTEGRATIONS_ENABLED", "true");
    createMock.mockReset();
    listMock.mockReset();
    revokeMock.mockReset();
    listGrantsMock.mockReset();
    upsertGrantsMock.mockReset();
    authenticateTokenMock.mockReset();
    listGrantedNotesMock.mockReset();
    getGrantedNoteMock.mockReset();
    updateGrantedNoteMock.mockReset();
    listGrantedBoardsMock.mockReset();
    getGrantedBoardMock.mockReset();
    updateGrantedBoardMock.mockReset();

    createMock.mockResolvedValue({
      integration: { id: INTEGRATION_ID, name: "Cursor", type: "mcp", createdAt: new Date(), tokenPrefix: "sk_int_ab" },
      token: "sk_int_secret",
      integrationId: INTEGRATION_ID,
    });
    authenticateTokenMock.mockResolvedValue({
      integrationId: INTEGRATION_ID,
      userId: USER_ID,
      tokenId: "tok-1",
    });
    listGrantedNotesMock.mockResolvedValue([]);
    getGrantedNoteMock.mockResolvedValue({ id: NOTE_ID });
    updateGrantedNoteMock.mockResolvedValue({ id: NOTE_ID });
    revokeMock.mockResolvedValue({ ok: true });
    listGrantsMock.mockResolvedValue([]);
    upsertGrantsMock.mockResolvedValue([]);
    listGrantedBoardsMock.mockResolvedValue([]);
    getGrantedBoardMock.mockResolvedValue({ id: BOARD_ID });
    updateGrantedBoardMock.mockResolvedValue({ id: BOARD_ID });
  });

  it("GET /api/integrations lists integrations", async () => {
    listMock.mockResolvedValue([{ id: INTEGRATION_ID }]);
    const { GET } = await import("@/app/api/integrations/route");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(listMock).toHaveBeenCalledWith(USER_ID);
  });

  it("POST /api/integrations rejects plaintext integration key in body", async () => {
    const { POST } = await import("@/app/api/integrations/route");
    const response = await POST(
      new Request("http://localhost/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Cursor", integrationKey: "raw-key" }),
      })
    );
    expect(response.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("POST /api/integrations creates integration with name", async () => {
    const { POST } = await import("@/app/api/integrations/route");
    const response = await POST(
      new Request("http://localhost/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Cursor" }),
      })
    );
    expect(response.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith(USER_ID, "Cursor", "mcp");
  });

  it("DELETE /api/integrations/:id revokes integration", async () => {
    const { DELETE } = await import("@/app/api/integrations/[id]/route");
    const response = await DELETE(
      new Request("http://localhost/api/integrations/" + INTEGRATION_ID, { method: "DELETE" }),
      { params: Promise.resolve({ id: INTEGRATION_ID }) }
    );
    expect(response.status).toBe(200);
    expect(revokeMock).toHaveBeenCalledWith(USER_ID, INTEGRATION_ID);
  });

  it("PUT /api/integrations/:id/grants rejects plaintext title", async () => {
    const { PUT } = await import("@/app/api/integrations/[id]/grants/route");
    const response = await PUT(
      new Request("http://localhost/api/integrations/" + INTEGRATION_ID + "/grants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grants: [{ title: "secret" }] }),
      }),
      { params: Promise.resolve({ id: INTEGRATION_ID }) }
    );
    expect(response.status).toBe(400);
    expect(upsertGrantsMock).not.toHaveBeenCalled();
  });

  it("GET /api/integrations/mcp/notes uses bearer auth", async () => {
    const { GET } = await import("@/app/api/integrations/mcp/notes/route");
    const response = await GET(
      new Request("http://localhost/api/integrations/mcp/notes", {
        headers: { Authorization: "Bearer sk_int_test" },
      })
    );
    expect(response.status).toBe(200);
    expect(authenticateTokenMock).toHaveBeenCalled();
    expect(listGrantedNotesMock).toHaveBeenCalled();
  });

  it("GET /api/integrations/mcp/notes/:id returns note", async () => {
    const { GET } = await import("@/app/api/integrations/mcp/notes/[id]/route");
    const response = await GET(
      new Request("http://localhost/api/integrations/mcp/notes/" + NOTE_ID, {
        headers: { Authorization: "Bearer sk_int_test" },
      }),
      { params: Promise.resolve({ id: NOTE_ID }) }
    );
    expect(response.status).toBe(200);
    expect(getGrantedNoteMock).toHaveBeenCalled();
  });

  it("PUT /api/integrations/mcp/notes/:id rejects plaintext body", async () => {
    const { PUT } = await import("@/app/api/integrations/mcp/notes/[id]/route");
    const response = await PUT(
      new Request("http://localhost/api/integrations/mcp/notes/" + NOTE_ID, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer sk_int_test" },
        body: JSON.stringify({ body: "plaintext" }),
      }),
      { params: Promise.resolve({ id: NOTE_ID }) }
    );
    expect(response.status).toBe(400);
    expect(updateGrantedNoteMock).not.toHaveBeenCalled();
  });

  it("PUT /api/integrations/mcp/notes/:id updates encrypted note", async () => {
    const { PUT } = await import("@/app/api/integrations/mcp/notes/[id]/route");
    const response = await PUT(
      new Request("http://localhost/api/integrations/mcp/notes/" + NOTE_ID, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer sk_int_test" },
        body: JSON.stringify({
          encryptedMetadata: encryptedPayload("note_metadata", NOTE_ID),
          encryptedBody: encryptedPayload("note_body", NOTE_ID),
        }),
      }),
      { params: Promise.resolve({ id: NOTE_ID }) }
    );
    expect(response.status).toBe(200);
    expect(updateGrantedNoteMock).toHaveBeenCalled();
  });

  it("GET /api/integrations/:id/grants lists grant summaries", async () => {
    const { GET } = await import("@/app/api/integrations/[id]/grants/route");
    const response = await GET(
      new Request("http://localhost/api/integrations/" + INTEGRATION_ID + "/grants"),
      { params: Promise.resolve({ id: INTEGRATION_ID }) }
    );
    expect(response.status).toBe(200);
    expect(listGrantsMock).toHaveBeenCalledWith(USER_ID, INTEGRATION_ID);
  });

  it("GET /api/integrations/mcp/kanban uses bearer auth", async () => {
    const { GET } = await import("@/app/api/integrations/mcp/kanban/route");
    const response = await GET(
      new Request("http://localhost/api/integrations/mcp/kanban", {
        headers: { Authorization: "Bearer sk_int_test" },
      })
    );
    expect(response.status).toBe(200);
    expect(listGrantedBoardsMock).toHaveBeenCalled();
  });

  it("GET /api/integrations/mcp/kanban/:boardId returns board", async () => {
    const { GET } = await import("@/app/api/integrations/mcp/kanban/[boardId]/route");
    const response = await GET(
      new Request("http://localhost/api/integrations/mcp/kanban/" + BOARD_ID, {
        headers: { Authorization: "Bearer sk_int_test" },
      }),
      { params: Promise.resolve({ boardId: BOARD_ID }) }
    );
    expect(response.status).toBe(200);
    expect(getGrantedBoardMock).toHaveBeenCalled();
  });
});
