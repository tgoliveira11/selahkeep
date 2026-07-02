import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  USER_ID,
  NOTE_ID,
  BOARD_ID,
  encryptedPayload,
  createNoteInput,
} from "@/test/helpers/fixtures";
import { generateIntegrationToken, hashIntegrationToken } from "@/lib/integrations/integration-token";

const INTEGRATION_ID = "6ba26317-e15f-4818-ac44-1a46351c0638";

const mocks = vi.hoisted(() => ({
  createIntegration: vi.fn(),
  createToken: vi.fn(),
  listByUserId: vi.fn(),
  revokeIntegration: vi.fn(),
  findByIdForUser: vi.fn(),
  upsertGrant: vi.fn(),
  listGrants: vi.fn(),
  findByTokenHash: vi.fn(),
  touchTokenLastUsed: vi.fn(),
  findGrant: vi.fn(),
  listGrantedResourceIds: vi.fn(),
  findVaultByUserId: vi.fn(),
  findByIdForVault: vi.fn(),
  findByVaultId: vi.fn(),
  findKanbanByVaultId: vi.fn(),
  findKanbanByIdForVault: vi.fn(),
  record: vi.fn(),
  enforceRateLimit: vi.fn(),
  noteUpdate: vi.fn(),
  kanbanUpdate: vi.fn(),
}));

function grantPayload(resourceId: string) {
  return {
    ...encryptedPayload("integration_grant", resourceId),
    aad: {
      userId: USER_ID,
      resourceId,
      field: "integration_grant" as const,
      integrationId: INTEGRATION_ID,
    },
  };
}

vi.mock("@/modules/integrations/repositories/integration-repository", () => ({
  integrationRepository: {
    createIntegration: mocks.createIntegration,
    createToken: mocks.createToken,
    listByUserId: mocks.listByUserId,
    revokeIntegration: mocks.revokeIntegration,
    findByIdForUser: mocks.findByIdForUser,
    upsertGrant: mocks.upsertGrant,
    listGrants: mocks.listGrants,
    findByTokenHash: mocks.findByTokenHash,
    touchTokenLastUsed: mocks.touchTokenLastUsed,
    findGrant: mocks.findGrant,
    listGrantedResourceIds: mocks.listGrantedResourceIds,
  },
}));

vi.mock("@/modules/vault/repositories/vault-repository", () => ({
  vaultRepository: { findVaultByUserId: mocks.findVaultByUserId },
}));

vi.mock("@/modules/notes/repositories/note-repository", () => ({
  noteRepository: {
    findByIdForVault: mocks.findByIdForVault,
    findByVaultId: mocks.findByVaultId,
  },
}));

vi.mock("@/modules/notes/repositories/kanban-repository", () => ({
  kanbanRepository: {
    findByVaultId: mocks.findKanbanByVaultId,
    findByIdForVault: mocks.findKanbanByIdForVault,
  },
}));

vi.mock("@/modules/audit/repositories/audit-repository", () => ({
  auditRepository: { record: mocks.record },
}));

vi.mock("@/modules/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
}));

vi.mock("@/modules/notes/services/note-service", () => ({
  noteService: { update: mocks.noteUpdate },
}));

vi.mock("@/modules/notes/services/kanban-service", () => ({
  kanbanService: { update: mocks.kanbanUpdate },
}));

const auth = {
  integrationId: INTEGRATION_ID,
  userId: USER_ID,
  tokenId: "tok-1",
};

describe("integration service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("INTEGRATIONS_ENABLED", "true");
    mocks.findVaultByUserId.mockResolvedValue({ id: "vault-1" });
    mocks.enforceRateLimit.mockResolvedValue(undefined);
    mocks.findByIdForUser.mockResolvedValue({ id: INTEGRATION_ID, userId: USER_ID });
  });

  it("creates integration with token prefix", async () => {
    const { integrationService } = await import(
      "@/modules/integrations/services/integration-service"
    );
    mocks.createIntegration.mockResolvedValue({
      id: INTEGRATION_ID,
      name: "Cursor",
      type: "mcp",
      createdAt: new Date("2026-01-01"),
    });

    const result = await integrationService.create(USER_ID, "Cursor");
    expect(result.token.startsWith("sk_int_")).toBe(true);
    expect(result.integrationId).toBe(INTEGRATION_ID);
    expect(mocks.record).toHaveBeenCalledWith("integration_created", USER_ID, expect.any(Object));
  });

  it("lists integrations for user", async () => {
    const { integrationService } = await import(
      "@/modules/integrations/services/integration-service"
    );
    mocks.listByUserId.mockResolvedValue([{ id: INTEGRATION_ID }]);
    await expect(integrationService.list(USER_ID)).resolves.toEqual([{ id: INTEGRATION_ID }]);
  });

  it("revokes integration", async () => {
    const { integrationService } = await import(
      "@/modules/integrations/services/integration-service"
    );
    mocks.revokeIntegration.mockResolvedValue(true);
    await expect(integrationService.revoke(USER_ID, INTEGRATION_ID)).resolves.toEqual({ ok: true });
    expect(mocks.record).toHaveBeenCalledWith("integration_revoked", USER_ID, expect.any(Object));
  });

  it("revoke throws when integration missing", async () => {
    const { integrationService, NotFoundError } = await import(
      "@/modules/integrations/services/integration-service"
    );
    mocks.revokeIntegration.mockResolvedValue(false);
    await expect(integrationService.revoke(USER_ID, INTEGRATION_ID)).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("lists grants for user without keys", async () => {
    const { integrationService } = await import(
      "@/modules/integrations/services/integration-service"
    );
    mocks.listGrants.mockResolvedValue([
      {
        id: "g1",
        resourceType: "note",
        resourceId: NOTE_ID,
        permissions: "read",
        createdAt: new Date(),
        encryptedWrappedKey: grantPayload(NOTE_ID),
      },
    ]);

    const grants = await integrationService.listGrantsForUser(USER_ID, INTEGRATION_ID);
    expect(grants).toEqual([
      expect.objectContaining({ resourceId: NOTE_ID, permissions: "read" }),
    ]);
    expect(grants[0]).not.toHaveProperty("encryptedWrappedKey");
  });

  it("upserts encrypted grants for owned resources", async () => {
    const { integrationService } = await import(
      "@/modules/integrations/services/integration-service"
    );
    mocks.findByIdForVault.mockResolvedValue({ id: NOTE_ID });
    mocks.listGrants.mockResolvedValue([]);

    const input = {
      grants: [
        {
          resourceType: "note" as const,
          resourceId: NOTE_ID,
          permissions: "write" as const,
          encryptedWrappedKey: grantPayload(NOTE_ID),
        },
      ],
    };

    await integrationService.upsertGrants(USER_ID, INTEGRATION_ID, input);
    expect(mocks.upsertGrant).toHaveBeenCalled();
  });

  it("authenticates bearer token", async () => {
    const { integrationService } = await import(
      "@/modules/integrations/services/integration-service"
    );
    const { token } = generateIntegrationToken();
    mocks.findByTokenHash.mockResolvedValue({
      integrationId: INTEGRATION_ID,
      userId: USER_ID,
      tokenId: "tok-1",
      expiresAt: null,
    });

    const request = new Request("http://localhost/api/integrations/mcp/notes", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const ctx = await integrationService.authenticateToken(request);
    expect(ctx.integrationId).toBe(INTEGRATION_ID);
    expect(mocks.findByTokenHash).toHaveBeenCalledWith(hashIntegrationToken(token));
    expect(mocks.touchTokenLastUsed).toHaveBeenCalledWith("tok-1");
  });

  it("rejects missing bearer token", async () => {
    const { integrationService, UnauthorizedIntegrationError } = await import(
      "@/modules/integrations/services/integration-service"
    );
    const request = new Request("http://localhost/api/integrations/mcp/notes");
    await expect(integrationService.authenticateToken(request)).rejects.toBeInstanceOf(
      UnauthorizedIntegrationError
    );
  });

  it("rejects expired bearer token", async () => {
    const { integrationService, UnauthorizedIntegrationError } = await import(
      "@/modules/integrations/services/integration-service"
    );
    const { token } = generateIntegrationToken();
    mocks.findByTokenHash.mockResolvedValue({
      integrationId: INTEGRATION_ID,
      userId: USER_ID,
      tokenId: "tok-1",
      expiresAt: new Date("2020-01-01"),
    });

    const request = new Request("http://localhost/api/integrations/mcp/notes", {
      headers: { Authorization: `Bearer ${token}` },
    });

    await expect(integrationService.authenticateToken(request)).rejects.toBeInstanceOf(
      UnauthorizedIntegrationError
    );
  });

  it("lists granted notes with audit", async () => {
    const { integrationService } = await import(
      "@/modules/integrations/services/integration-service"
    );
    mocks.listGrantedResourceIds.mockResolvedValue([NOTE_ID]);
    mocks.findByVaultId.mockResolvedValue([{ id: NOTE_ID }]);
    mocks.listGrants.mockResolvedValue([
      {
        resourceType: "note",
        resourceId: NOTE_ID,
        permissions: "read",
        encryptedWrappedKey: grantPayload(NOTE_ID),
      },
    ]);

    const notes = await integrationService.listGrantedNotes(auth);
    expect(notes).toHaveLength(1);
    expect(mocks.record).toHaveBeenCalledWith(
      "integration_mcp_read",
      USER_ID,
      expect.objectContaining({ resourceType: "note" })
    );
  });

  it("returns empty list when no note grants", async () => {
    const { integrationService } = await import(
      "@/modules/integrations/services/integration-service"
    );
    mocks.listGrantedResourceIds.mockResolvedValue([]);
    await expect(integrationService.listGrantedNotes(auth)).resolves.toEqual([]);
  });

  it("gets granted note when grant exists", async () => {
    const { integrationService } = await import(
      "@/modules/integrations/services/integration-service"
    );
    mocks.findGrant.mockResolvedValue({
      permissions: "read",
      encryptedWrappedKey: grantPayload(NOTE_ID),
    });
    mocks.findByIdForVault.mockResolvedValue({ id: NOTE_ID });

    const note = await integrationService.getGrantedNote(auth, NOTE_ID);
    expect(note.id).toBe(NOTE_ID);
    expect(note.grant.permissions).toBe("read");
  });

  it("rejects MCP access without grant", async () => {
    const { integrationService, NotFoundError } = await import(
      "@/modules/integrations/services/integration-service"
    );
    mocks.findGrant.mockResolvedValue(null);

    await expect(integrationService.getGrantedNote(auth, NOTE_ID)).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("rejects write without write grant", async () => {
    const { integrationService, ForbiddenError } = await import(
      "@/modules/integrations/services/integration-service"
    );
    mocks.findGrant.mockResolvedValue({
      permissions: "read",
      encryptedWrappedKey: grantPayload(NOTE_ID),
    });

    await expect(
      integrationService.updateGrantedNote(auth, NOTE_ID, {})
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("updates granted note with write permission", async () => {
    const { integrationService } = await import(
      "@/modules/integrations/services/integration-service"
    );
    mocks.findGrant.mockResolvedValue({
      permissions: "write",
      encryptedWrappedKey: grantPayload(NOTE_ID),
    });
    mocks.noteUpdate.mockResolvedValue({ id: NOTE_ID });

    const input = createNoteInput();
    await expect(integrationService.updateGrantedNote(auth, NOTE_ID, input)).resolves.toEqual({
      id: NOTE_ID,
    });
    expect(mocks.record).toHaveBeenCalledWith(
      "integration_mcp_write",
      USER_ID,
      expect.objectContaining({ resourceId: NOTE_ID })
    );
  });

  it("lists granted boards", async () => {
    const { integrationService } = await import(
      "@/modules/integrations/services/integration-service"
    );
    mocks.listGrantedResourceIds.mockResolvedValue([BOARD_ID]);
    mocks.findKanbanByVaultId.mockResolvedValue([{ id: BOARD_ID }]);
    mocks.listGrants.mockResolvedValue([
      {
        resourceType: "kanban_board",
        resourceId: BOARD_ID,
        permissions: "write",
        encryptedWrappedKey: grantPayload(BOARD_ID),
      },
    ]);

    const boards = await integrationService.listGrantedBoards(auth);
    expect(boards).toHaveLength(1);
    expect(boards[0].grant.permissions).toBe("write");
  });

  it("gets granted board", async () => {
    const { integrationService } = await import(
      "@/modules/integrations/services/integration-service"
    );
    mocks.findGrant.mockResolvedValue({
      permissions: "read",
      encryptedWrappedKey: grantPayload(BOARD_ID),
    });
    mocks.findKanbanByIdForVault.mockResolvedValue({ id: BOARD_ID });

    const board = await integrationService.getGrantedBoard(auth, BOARD_ID);
    expect(board.id).toBe(BOARD_ID);
  });

  it("updates granted board with write permission", async () => {
    const { integrationService } = await import(
      "@/modules/integrations/services/integration-service"
    );
    mocks.findGrant.mockResolvedValue({
      permissions: "write",
      encryptedWrappedKey: grantPayload(BOARD_ID),
    });
    mocks.kanbanUpdate.mockResolvedValue({ id: BOARD_ID });

    await expect(
      integrationService.updateGrantedBoard(auth, BOARD_ID, { encryptedBoard: encryptedPayload("note_kanban_board", BOARD_ID) })
    ).resolves.toEqual({ id: BOARD_ID });
  });

  it("throws when integrations disabled", async () => {
    vi.stubEnv("INTEGRATIONS_ENABLED", "false");
    const { integrationService } = await import(
      "@/modules/integrations/services/integration-service"
    );
    const { IntegrationsDisabledError } = await import("@/lib/integrations/integrations-enabled");

    await expect(integrationService.list(USER_ID)).rejects.toBeInstanceOf(IntegrationsDisabledError);
  });
});
