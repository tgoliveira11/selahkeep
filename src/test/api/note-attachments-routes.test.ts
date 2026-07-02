import { describe, it, expect, vi, beforeEach } from "vitest";
import { ENCRYPTION_VERSION } from "@/lib/validation/encrypted-payload";
import { encryptedPayload, NOTE_ID, USER_ID } from "@/test/helpers/fixtures";

const ATTACHMENT_ID = "550e8400-e29b-41d4-a716-446655440005";

const mocks = vi.hoisted(() => ({
  requireFullyAuthenticatedUser: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  getById: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireFullyAuthenticatedUser: mocks.requireFullyAuthenticatedUser,
  UnauthorizedError: class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  },
}));

vi.mock("@/server/services/note-attachment-service", () => ({
  noteAttachmentService: {
    list: mocks.list,
    create: mocks.create,
    getById: mocks.getById,
    delete: mocks.delete,
  },
}));

function createAttachmentBody() {
  return {
    id: ATTACHMENT_ID,
    encryptedMetadata: encryptedPayload("note_attachment_metadata", ATTACHMENT_ID),
    encryptedBlob: encryptedPayload("note_attachment_blob", ATTACHMENT_ID),
    blobEncryptionVersion: ENCRYPTION_VERSION,
    ciphertextBytes: 1024,
  };
}

describe("note attachments API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
  });

  it("GET lists attachments for a note", async () => {
    mocks.list.mockResolvedValue([{ id: ATTACHMENT_ID }]);
    const { GET } = await import("@/app/api/notes/[id]/attachments/route");
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: NOTE_ID }),
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ attachments: [{ id: ATTACHMENT_ID }] });
    expect(mocks.list).toHaveBeenCalledWith(NOTE_ID, USER_ID);
  });

  it("POST creates encrypted attachment", async () => {
    mocks.create.mockResolvedValue({ id: ATTACHMENT_ID });
    const { POST } = await import("@/app/api/notes/[id]/attachments/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify(createAttachmentBody()),
      }),
      { params: Promise.resolve({ id: NOTE_ID }) }
    );
    expect(res.status).toBe(201);
    expect(mocks.create).toHaveBeenCalled();
  });

  it("POST rejects plaintext attachment fields", async () => {
    const { POST } = await import("@/app/api/notes/[id]/attachments/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ filename: "secret.txt", ...createAttachmentBody() }),
      }),
      { params: Promise.resolve({ id: NOTE_ID }) }
    );
    expect(res.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("POST rejects invalid encrypted payload", async () => {
    const { POST } = await import("@/app/api/notes/[id]/attachments/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ id: "not-a-uuid" }),
      }),
      { params: Promise.resolve({ id: NOTE_ID }) }
    );
    expect(res.status).toBe(400);
  });

  it("GET attachment by id returns record", async () => {
    mocks.getById.mockResolvedValue({ id: ATTACHMENT_ID });
    const { GET } = await import("@/app/api/notes/[id]/attachments/[attachmentId]/route");
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: NOTE_ID, attachmentId: ATTACHMENT_ID }),
    });
    expect(res.status).toBe(200);
    expect(mocks.getById).toHaveBeenCalledWith(NOTE_ID, ATTACHMENT_ID, USER_ID);
  });

  it("DELETE attachment removes record", async () => {
    mocks.delete.mockResolvedValue({ deleted: true });
    const { DELETE } = await import("@/app/api/notes/[id]/attachments/[attachmentId]/route");
    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ id: NOTE_ID, attachmentId: ATTACHMENT_ID }),
    });
    expect(res.status).toBe(200);
    expect(mocks.delete).toHaveBeenCalledWith(NOTE_ID, ATTACHMENT_ID, USER_ID);
  });
});
