"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AccountSessionView } from "@/lib/account-session-types";
import { formatAuthMethod } from "@/lib/ui/format-auth-method";
import { formatSessionDateTime } from "@/lib/ui/format-session-datetime";

interface SessionCardProps {
  session: AccountSessionView;
  onRevoke: (sessionId: string) => void;
  revoking?: boolean;
}

function formatDeviceType(deviceType: string): string {
  if (deviceType === "unknown") return "Unknown device";
  return deviceType.charAt(0).toUpperCase() + deviceType.slice(1);
}

export function SessionCard({ session, onRevoke, revoking }: SessionCardProps) {
  const title =
    session.browser !== "unknown" && session.platform !== "unknown"
      ? `${session.browser} on ${session.platform}`
      : "Unknown browser";

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-[var(--foreground)]">{title}</p>
            {session.isCurrent && <Badge variant="success">This session</Badge>}
          </div>
          <p className="text-sm text-[var(--muted)]">{formatDeviceType(session.deviceType)}</p>
        </div>
        {!session.isCurrent && (
          <Button
            variant="secondary"
            className="min-h-9 px-3 py-2 text-xs"
            disabled={revoking}
            onClick={() => onRevoke(session.id)}
          >
            Sign out
          </Button>
        )}
      </div>
      <dl className="grid gap-2 text-sm text-[var(--muted)]">
        <div>
          <dt className="sr-only">Sign-in method</dt>
          <dd>Signed in with {formatAuthMethod(session.authMethod)}</dd>
        </div>
        <div>
          <dt className="sr-only">Last used</dt>
          <dd>Last used: {formatSessionDateTime(session.lastUsedAt)}</dd>
        </div>
        <div>
          <dt className="sr-only">IP</dt>
          <dd>IP: {session.ipMasked}</dd>
        </div>
      </dl>
    </Card>
  );
}
