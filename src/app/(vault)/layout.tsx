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
  // NoteSearchProvider wraps the shell so the header search bar and the notes
  // list share one query (the desktop top bar lives in the header).
  return (
    <NoteSearchProvider>
      <SiteShell hideFooter>
        <VoiceWarmup />
        <VaultSessionManager>{children}</VaultSessionManager>
      </SiteShell>
    </NoteSearchProvider>
  );
}
