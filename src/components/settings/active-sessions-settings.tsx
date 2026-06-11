"use client";

import { useCallback, useEffect, useState } from "react";
import { signOutAccount } from "@/lib/auth/sign-out-client";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingState } from "@/components/ui/loading-state";
import { SessionCard } from "@/components/settings/session-card";
import { accountSessionsApi } from "@/lib/api-client/account-sessions";
import type { AccountSessionView } from "@/lib/account-session-types";

type ConfirmAction =
  | { type: "revoke"; sessionId: string }
  | { type: "revoke-others" }
  | { type: "revoke-all" };

export function ActiveSessionsSettings() {
  const router = useRouter();
  const [sessions, setSessions] = useState<AccountSessionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);

  const loadSessions = useCallback(async () => {
    setError(null);
    try {
      const result = await accountSessionsApi.list();
      setSessions(result.sessions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load active sessions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void accountSessionsApi.ping().catch(() => undefined);
    void loadSessions();
  }, [loadSessions]);

  async function handleConfirm() {
    if (!confirm) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (confirm.type === "revoke") {
        const result = await accountSessionsApi.revoke(confirm.sessionId);
        if (result.signOut) {
          await signOutAccount();
          router.push("/login");
          return;
        }
        setSuccess("Session revoked.");
      } else if (confirm.type === "revoke-others") {
        await accountSessionsApi.revokeOthers();
        setSuccess("All other sessions have been signed out.");
      } else {
        await accountSessionsApi.revokeAll();
        await signOutAccount();
        router.push("/login");
        return;
      }
      await loadSessions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update sessions.");
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  }

  if (loading) {
    return <LoadingState label="Loading active sessions…" />;
  }

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">
        These are browsers or devices currently signed in to your account. If you do not recognize
        a session, revoke it. Account sessions are separate from trusted devices — revoking a
        session signs out that browser but does not remove vault unlock trust.
      </p>

      {sessions.length === 0 ? (
        <Alert variant="muted">No active sessions were found.</Alert>
      ) : (
        <ul className="space-y-3">
          {sessions.map((session) => (
            <li key={session.id}>
              <SessionCard
                session={session}
                revoking={actionLoading}
                onRevoke={(sessionId) => setConfirm({ type: "revoke", sessionId })}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="secondary"
          disabled={actionLoading || otherSessions.length === 0}
          onClick={() => setConfirm({ type: "revoke-others" })}
        >
          Sign out of all other sessions
        </Button>
        <Button
          variant="danger"
          disabled={actionLoading || sessions.length === 0}
          onClick={() => setConfirm({ type: "revoke-all" })}
        >
          Sign out everywhere
        </Button>
      </div>

      {success && <Alert variant="success">{success}</Alert>}
      {error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}

      <ConfirmDialog
        open={confirm?.type === "revoke"}
        title="Sign out this session?"
        description="This session will no longer be able to access your account."
        confirmLabel="Sign out session"
        variant="danger"
        loading={actionLoading}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmDialog
        open={confirm?.type === "revoke-others"}
        title="Sign out of all other sessions?"
        description="You will stay signed in here, but other browsers and devices will be signed out."
        confirmLabel="Sign out others"
        variant="danger"
        loading={actionLoading}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmDialog
        open={confirm?.type === "revoke-all"}
        title="Sign out everywhere?"
        description="This will sign you out everywhere, including this browser."
        confirmLabel="Sign out everywhere"
        variant="danger"
        loading={actionLoading}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
