import { auditRepository } from "@/modules/audit/repositories/audit-repository";
import { integrationRepository } from "@/modules/integrations/repositories/integration-repository";
import { kanbanRepository } from "@/modules/notes/repositories/kanban-repository";
import { noteRepository } from "@/modules/notes/repositories/note-repository";
import { vaultRepository } from "@/modules/vault/repositories/vault-repository";
import { generateIntegrationToken, hashIntegrationToken, extractBearerToken } from "@/lib/integrations/integration-token";
import {
  assertIntegrationGrantAad,
  type IntegrationGrantItem,
  type UpsertIntegrationGrantsInput,
} from "@/lib/validation/integrations";
import type { UpdateNoteInput } from "@/lib/validation/notes";
import type { UpdateKanbanBoardInput } from "@/lib/validation/kanban";
import { assertIntegrationsEnabled } from "@/lib/integrations/integrations-enabled";
import { enforceRateLimit } from "@/modules/rate-limit";
import { getClientIp } from "@/modules/security/ip/request-ip";

export type IntegrationAuthContext = {
  integrationId: string;
  userId: string;
  tokenId: string;
};

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedIntegrationError extends Error {
  constructor(message = "Invalid integration token") {
    super(message);
    this.name = "UnauthorizedIntegrationError";
  }
}

async function requireVault(userId: string) {
  const vault = await vaultRepository.findVaultByUserId(userId);
  if (!vault) throw new NotFoundError("Vault not initialized");
  return vault;
}

export const integrationService = {
  async create(userId: string, name: string, type = "mcp") {
    assertIntegrationsEnabled();
    const integration = await integrationRepository.createIntegration({ userId, name, type });
    const { token, tokenHash, tokenPrefix } = generateIntegrationToken();
    await integrationRepository.createToken({
      integrationId: integration.id,
      tokenHash,
      tokenPrefix,
    });
    await auditRepository.record("integration_created", userId, {
      integrationId: integration.id,
      type,
    });
    return {
      integration: {
        id: integration.id,
        name: integration.name,
        type: integration.type,
        createdAt: integration.createdAt,
        tokenPrefix,
      },
      token,
      integrationId: integration.id,
    };
  },

  async list(userId: string) {
    assertIntegrationsEnabled();
    return integrationRepository.listByUserId(userId);
  },

  async revoke(userId: string, integrationId: string) {
    assertIntegrationsEnabled();
    const revoked = await integrationRepository.revokeIntegration(integrationId, userId);
    if (!revoked) throw new NotFoundError("Integration not found");
    await auditRepository.record("integration_revoked", userId, { integrationId });
    return { ok: true };
  },

  async upsertGrants(userId: string, integrationId: string, input: UpsertIntegrationGrantsInput) {
    assertIntegrationsEnabled();
    const integration = await integrationRepository.findByIdForUser(integrationId, userId);
    if (!integration) throw new NotFoundError("Integration not found");

    const vault = await requireVault(userId);

    for (const grant of input.grants) {
      assertIntegrationGrantAad(userId, integrationId, grant.resourceId, grant.encryptedWrappedKey);
      await assertResourceOwned(userId, vault.id, grant);
      await integrationRepository.upsertGrant({
        integrationId,
        resourceType: grant.resourceType,
        resourceId: grant.resourceId,
        permissions: grant.permissions,
        encryptedWrappedKey: grant.encryptedWrappedKey,
      });
    }

    return integrationRepository.listGrants(integrationId);
  },

  async listGrantsForUser(userId: string, integrationId: string) {
    assertIntegrationsEnabled();
    const integration = await integrationRepository.findByIdForUser(integrationId, userId);
    if (!integration) throw new NotFoundError("Integration not found");
    const grants = await integrationRepository.listGrants(integrationId);
    return grants.map((g) => ({
      id: g.id,
      resourceType: g.resourceType,
      resourceId: g.resourceId,
      permissions: g.permissions,
      createdAt: g.createdAt,
    }));
  },

  async authenticateToken(request: Request): Promise<IntegrationAuthContext> {
    assertIntegrationsEnabled();
    const token = extractBearerToken(request);
    if (!token) throw new UnauthorizedIntegrationError();

    const row = await integrationRepository.findByTokenHash(hashIntegrationToken(token));
    if (!row) throw new UnauthorizedIntegrationError();
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedIntegrationError("Integration token expired");
    }

    const ip = getClientIp(request);
    await enforceRateLimit({
      operation: "integrations.mcp",
      userId: row.userId,
      ip,
      endpoint: new URL(request.url).pathname,
    });

    await integrationRepository.touchTokenLastUsed(row.tokenId);

    return {
      integrationId: row.integrationId,
      userId: row.userId,
      tokenId: row.tokenId,
    };
  },

  async listGrantedNotes(auth: IntegrationAuthContext) {
    const vault = await requireVault(auth.userId);
    const noteIds = await integrationRepository.listGrantedResourceIds(auth.integrationId, "note");
    if (noteIds.length === 0) return [];

    const notes = await noteRepository.findByVaultId(vault.id);
    const granted = new Set(noteIds);
    const filtered = notes.filter((n) => granted.has(n.id));

    await auditRepository.record("integration_mcp_read", auth.userId, {
      integrationId: auth.integrationId,
      resourceType: "note",
      count: filtered.length,
    });

    const grants = await integrationRepository.listGrants(auth.integrationId);
    const grantMap = new Map(
      grants.filter((g) => g.resourceType === "note").map((g) => [g.resourceId, g])
    );

    return filtered.map((note) => ({
      ...note,
      grant: {
        permissions: grantMap.get(note.id)?.permissions ?? "read",
        encryptedWrappedKey: grantMap.get(note.id)?.encryptedWrappedKey,
      },
    }));
  },

  async getGrantedNote(auth: IntegrationAuthContext, noteId: string) {
    const grant = await integrationRepository.findGrant(auth.integrationId, "note", noteId);
    if (!grant) throw new NotFoundError("Note not found");

    const vault = await requireVault(auth.userId);
    const note = await noteRepository.findByIdForVault(noteId, vault.id);
    if (!note) throw new NotFoundError("Note not found");

    await auditRepository.record("integration_mcp_read", auth.userId, {
      integrationId: auth.integrationId,
      resourceType: "note",
      resourceId: noteId,
    });

    return {
      ...note,
      grant: {
        permissions: grant.permissions,
        encryptedWrappedKey: grant.encryptedWrappedKey,
      },
    };
  },

  async updateGrantedNote(auth: IntegrationAuthContext, noteId: string, input: UpdateNoteInput) {
    const grant = await integrationRepository.findGrant(auth.integrationId, "note", noteId);
    if (!grant) throw new NotFoundError("Note not found");
    if (grant.permissions !== "write") throw new ForbiddenError("Write permission required");

    const { noteService } = await import("@/modules/notes/services/note-service");
    const updated = await noteService.update(noteId, auth.userId, input);

    await auditRepository.record("integration_mcp_write", auth.userId, {
      integrationId: auth.integrationId,
      resourceType: "note",
      resourceId: noteId,
    });

    return updated;
  },

  async listGrantedBoards(auth: IntegrationAuthContext) {
    const boardIds = await integrationRepository.listGrantedResourceIds(
      auth.integrationId,
      "kanban_board"
    );
    if (boardIds.length === 0) return [];

    const vault = await requireVault(auth.userId);
    const boards = await kanbanRepository.findByVaultId(vault.id);
    const granted = new Set(boardIds);
    const filtered = boards.filter((b) => granted.has(b.id));

    await auditRepository.record("integration_mcp_read", auth.userId, {
      integrationId: auth.integrationId,
      resourceType: "kanban_board",
      count: filtered.length,
    });

    const grants = await integrationRepository.listGrants(auth.integrationId);
    const grantMap = new Map(
      grants.filter((g) => g.resourceType === "kanban_board").map((g) => [g.resourceId, g])
    );

    return filtered.map((board) => ({
      ...board,
      grant: {
        permissions: grantMap.get(board.id)?.permissions ?? "read",
        encryptedWrappedKey: grantMap.get(board.id)?.encryptedWrappedKey,
      },
    }));
  },

  async getGrantedBoard(auth: IntegrationAuthContext, boardId: string) {
    const grant = await integrationRepository.findGrant(auth.integrationId, "kanban_board", boardId);
    if (!grant) throw new NotFoundError("Board not found");

    const vault = await requireVault(auth.userId);
    const board = await kanbanRepository.findByIdForVault(boardId, vault.id);
    if (!board) throw new NotFoundError("Board not found");

    await auditRepository.record("integration_mcp_read", auth.userId, {
      integrationId: auth.integrationId,
      resourceType: "kanban_board",
      resourceId: boardId,
    });

    return {
      ...board,
      grant: {
        permissions: grant.permissions,
        encryptedWrappedKey: grant.encryptedWrappedKey,
      },
    };
  },

  async updateGrantedBoard(
    auth: IntegrationAuthContext,
    boardId: string,
    input: UpdateKanbanBoardInput
  ) {
    const grant = await integrationRepository.findGrant(auth.integrationId, "kanban_board", boardId);
    if (!grant) throw new NotFoundError("Board not found");
    if (grant.permissions !== "write") throw new ForbiddenError("Write permission required");

    const { kanbanService } = await import("@/modules/notes/services/kanban-service");
    const updated = await kanbanService.update(boardId, auth.userId, input);

    await auditRepository.record("integration_mcp_write", auth.userId, {
      integrationId: auth.integrationId,
      resourceType: "kanban_board",
      resourceId: boardId,
    });

    return updated;
  },
};

async function assertResourceOwned(
  userId: string,
  vaultId: string,
  grant: IntegrationGrantItem
): Promise<void> {
  if (grant.resourceType === "note") {
    const note = await noteRepository.findByIdForVault(grant.resourceId, vaultId);
    if (!note) throw new NotFoundError(`Note not found: ${grant.resourceId}`);
    return;
  }
  const board = await kanbanRepository.findByIdForVault(grant.resourceId, vaultId);
  if (!board) throw new NotFoundError(`Board not found: ${grant.resourceId}`);
}
