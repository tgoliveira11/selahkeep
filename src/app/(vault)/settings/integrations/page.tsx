"use client";

import { useMemo, useState } from "react";
import { AuthenticatedPage } from "@/components/layout/authenticated-page";
import { PageLayout } from "@/components/layout/page-layout";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useRequireVault } from "@/features/vault/use-require-vault";
import { useIntegrations } from "@/features/integrations/use-integrations";
import { useVaultIndex } from "@/features/notes/use-vault-index";
import { BRIDGE_CONNECT_URL } from "@/lib/integrations/bridge-config";

function buildMcpConfig(apiUrl: string, token: string, integrationKey: string) {
  return {
    mcpServers: {
      selahkeep: {
        command: "npx",
        args: ["-y", "@selahkeep/mcp"],
        env: {
          SELAHKEEP_API_URL: apiUrl,
          SELAHKEEP_INTEGRATION_TOKEN: token,
          SELAHKEEP_INTEGRATION_KEY: integrationKey,
        },
      },
    },
  };
}

export default function IntegrationsSettingsPage() {
  const vault = useRequireVault();
  const userId = vault.status === "ready" ? vault.userId : null;
  const vaultUnlocked = vault.status === "ready" ? vault.vaultUnlocked : false;
  const { index, loading: indexLoading } = useVaultIndex(userId, vaultUnlocked);
  const {
    integrations,
    loading,
    error,
    createIntegration,
    revokeIntegration,
    saveGrants,
  } = useIntegrations(vaultUnlocked);

  const [name, setName] = useState("Cursor");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [secrets, setSecrets] = useState<{
    integrationId: string;
    token: string;
    integrationKey: string;
  } | null>(null);
  const [selectedNotes, setSelectedNotes] = useState<Record<string, "read" | "write">>({});
  const [selectedBoards, setSelectedBoards] = useState<Record<string, "read" | "write">>({});

  const apiUrl = useMemo(
    () => (typeof window !== "undefined" ? window.location.origin : "https://www.selahkeep.com"),
    []
  );

  if (vault.status === "loading" || vault.status === "redirecting") {
    return (
      <AuthenticatedPage width="settings">
        <LoadingState label="Loading integrations" />
      </AuthenticatedPage>
    );
  }

  if (vault.status === "error") {
    return (
      <AuthenticatedPage width="settings">
        <ErrorState message={vault.message} />
      </AuthenticatedPage>
    );
  }

  if (!vaultUnlocked) {
    return (
      <AuthenticatedPage width="settings">
        <PageLayout width="settings">
          <Alert variant="info">Unlock your vault to manage integrations.</Alert>
        </PageLayout>
      </AuthenticatedPage>
    );
  }

  async function handleCreate() {
    setBusy(true);
    setActionError(null);
    try {
      const created = await createIntegration(name.trim() || "MCP");
      setSecrets({
        integrationId: created.integrationId,
        token: created.token,
        integrationKey: created.integrationKey,
      });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to create integration");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveGrants() {
    if (!secrets || !userId) return;
    setBusy(true);
    setActionError(null);
    try {
      const items = [
        ...Object.entries(selectedNotes).map(([resourceId, permissions]) => ({
          resourceType: "note" as const,
          resourceId,
          permissions,
        })),
        ...Object.entries(selectedBoards).map(([resourceId, permissions]) => ({
          resourceType: "kanban_board" as const,
          resourceId,
          permissions,
        })),
      ];
      if (items.length === 0) {
        setActionError("Select at least one note or board to share.");
        return;
      }
      await saveGrants(userId, secrets.integrationId, items);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to save grants");
    } finally {
      setBusy(false);
    }
  }

  async function handleHandoff() {
    if (!secrets) return;
    try {
      await fetch(BRIDGE_CONNECT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiBase: apiUrl,
          token: secrets.token,
          integrationKey: secrets.integrationKey,
          integrationId: secrets.integrationId,
        }),
      });
    } catch (e) {
      setActionError(
        e instanceof Error
          ? `Bridge handoff failed: ${e.message}. Use manual export below.`
          : "Bridge handoff failed"
      );
    }
  }

  const mcpJson = secrets
    ? JSON.stringify(buildMcpConfig(apiUrl, secrets.token, secrets.integrationKey), null, 2)
    : "";

  return (
    <AuthenticatedPage width="settings">
      <PageLayout width="settings">
        <PageHeader
          title="Integrations"
          description="Connect Cursor, Claude Desktop, or Codex via MCP. Share only the notes and boards you choose."
        />

        <Alert variant="warning" className="mb-6">
          Tools with your integration key can read and change selected items. AI providers may
          process decrypted content on their servers.
        </Alert>

        {error && <ErrorState message={error} />}
        {actionError && <Alert variant="danger">{actionError}</Alert>}

        <Card className="mb-6 space-y-4 p-6">
          <h2 className="text-lg font-semibold">Create integration</h2>
          <label className="block text-sm">
            Name
            <input
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cursor MacBook"
            />
          </label>
          <Button onClick={() => void handleCreate()} disabled={busy}>
            Create MCP integration
          </Button>
        </Card>

        {secrets && (
          <Card className="mb-6 space-y-4 p-6">
            <h2 className="text-lg font-semibold">Connect (shown once)</h2>
            <p className="text-sm text-[var(--muted)]">
              Save these credentials now. They will not be shown again.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void handleHandoff()}>
                Send to local bridge
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigator.clipboard.writeText(mcpJson)}
              >
                Copy mcp.json
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-md bg-[var(--surface-2)] p-3 text-xs">
              {mcpJson}
            </pre>
          </Card>
        )}

        {secrets && index && (
          <Card className="mb-6 space-y-4 p-6">
            <h2 className="text-lg font-semibold">Share resources</h2>
            <div className="space-y-2">
              <p className="text-sm font-medium">Notes</p>
              {index.entries.map((note) => (
                <label key={note.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={note.id in selectedNotes}
                    onChange={(e) => {
                      setSelectedNotes((prev) => {
                        const next = { ...prev };
                        if (e.target.checked) next[note.id] = "read";
                        else delete next[note.id];
                        return next;
                      });
                    }}
                  />
                  <span className="flex-1">{note.title || "Untitled"}</span>
                  {note.id in selectedNotes && (
                    <select
                      className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
                      value={selectedNotes[note.id]}
                      onChange={(e) =>
                        setSelectedNotes((prev) => ({
                          ...prev,
                          [note.id]: e.target.value as "read" | "write",
                        }))
                      }
                    >
                      <option value="read">Read</option>
                      <option value="write">Read + write</option>
                    </select>
                  )}
                </label>
              ))}
            </div>
            {index.kanbanBoards && index.kanbanBoards.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Boards</p>
                {index.kanbanBoards.map((board) => (
                  <label key={board.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={board.id in selectedBoards}
                      onChange={(e) => {
                        setSelectedBoards((prev) => {
                          const next = { ...prev };
                          if (e.target.checked) next[board.id] = "read";
                          else delete next[board.id];
                          return next;
                        });
                      }}
                    />
                    <span className="flex-1">{board.title}</span>
                    {board.id in selectedBoards && (
                      <select
                        className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
                        value={selectedBoards[board.id]}
                        onChange={(e) =>
                          setSelectedBoards((prev) => ({
                            ...prev,
                            [board.id]: e.target.value as "read" | "write",
                          }))
                        }
                      >
                        <option value="read">Read</option>
                        <option value="write">Read + write</option>
                      </select>
                    )}
                  </label>
                ))}
              </div>
            )}
            <Button onClick={() => void handleSaveGrants()} disabled={busy}>
              Save shared resources
            </Button>
          </Card>
        )}

        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Active integrations</h2>
          {loading || indexLoading ? (
            <LoadingState label="Loading integrations" />
          ) : integrations.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No integrations yet.</p>
          ) : (
            <ul className="space-y-3">
              {integrations.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-4 rounded-md border border-[var(--border)] p-3"
                >
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {row.tokenPrefix ?? "sk_int"}… · {row.type}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => void revokeIntegration(row.id)}
                    disabled={busy}
                  >
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </PageLayout>
    </AuthenticatedPage>
  );
}
