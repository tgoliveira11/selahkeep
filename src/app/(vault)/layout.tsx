"use client";

import { SiteShell } from "@/components/layout/site-shell";
import { VaultAutoLockNotice } from "@/features/vault/vault-auto-lock-notice";
import { useVaultActivity } from "@/features/vault/use-vault-activity";
import { NoteSearchProvider } from "@/features/notes/note-search-context";
import { VoiceWarmup } from "@/features/voice/voice-warmup";

function VaultSessionManager({ children }: { children: React.ReactNode }) {
  useVaultActivity();
  return (
    <>
      <VaultAutoLockNotice />
      {children}
    </>
  );
}

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteShell>
      <VoiceWarmup />
      <NoteSearchProvider>
        <VaultSessionManager>{children}</VaultSessionManager>
      </NoteSearchProvider>
    </SiteShell>
  );
}
