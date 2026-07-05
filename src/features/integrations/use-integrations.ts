"use client";

import { useCallback, useEffect, useState } from "react";
import { useOnVaultLocked } from "@tgoliveira/vault-core/react";
import {
  integrationsApi,
  type CreateIntegrationResponse,
  type IntegrationGrantSummary,
  type IntegrationListItem,
} from "@/lib/api-client/integrations";
import { notesApi } from "@/lib/api-client/notes";
import { kanbanApi } from "@/lib/api-client/kanban";
import {
  deriveIntegrationKey,
  exportIntegrationKeyBase64Url,
  wrapResourceKeyForIntegration,
} from "@/lib/crypto-client/integrations";
import { unwrapNoteKey } from "@/lib/crypto-client/note-key";
import { unwrapContentKey } from "@/lib/crypto-client/kanban";

export function useIntegrations(enabled: boolean) {
  const [integrations, setIntegrations] = useState<IntegrationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await integrationsApi.list();
      setIntegrations(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useOnVaultLocked(() => {
    setIntegrations([]);
    setError(null);
    setLoading(false);
  });

  const createIntegration = useCallback(async (name: string) => {
    const created = await integrationsApi.create(name);
    const iek = await deriveIntegrationKey(created.integrationId);
    const integrationKey = await exportIntegrationKeyBase64Url(iek);
    await reload();
    return { ...created, integrationKey } satisfies CreateIntegrationResponse & {
      integrationKey: string;
    };
  }, [reload]);

  const revokeIntegration = useCallback(
    async (id: string) => {
      await integrationsApi.revoke(id);
      await reload();
    },
    [reload]
  );

  const saveGrants = useCallback(
    async (
      userId: string,
      integrationId: string,
      items: Array<{
        resourceType: "note" | "kanban_board";
        resourceId: string;
        permissions: "read" | "write";
      }>
    ): Promise<IntegrationGrantSummary[]> => {
      const iek = await deriveIntegrationKey(integrationId);
      const grants = [];

      for (const item of items) {
        let resourceKey: CryptoKey;
        if (item.resourceType === "note") {
          const note = await notesApi.get(item.resourceId);
          resourceKey = await unwrapNoteKey(note.encryptedWrappedNoteKey);
        } else {
          const board = await kanbanApi.get(item.resourceId);
          resourceKey = await unwrapContentKey(board.encryptedWrappedKey);
        }

        const encryptedWrappedKey = await wrapResourceKeyForIntegration(
          userId,
          integrationId,
          item.resourceId,
          resourceKey,
          iek
        );

        grants.push({
          resourceType: item.resourceType,
          resourceId: item.resourceId,
          permissions: item.permissions,
          encryptedWrappedKey,
        });
      }

      return integrationsApi.upsertGrants(integrationId, { grants });
    },
    []
  );

  return {
    integrations,
    loading,
    error,
    reload,
    createIntegration,
    revokeIntegration,
    saveGrants,
  };
}
