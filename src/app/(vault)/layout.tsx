"use client";

import { SiteShell } from "@/components/layout/site-shell";
import { VaultAutoLockNotice } from "@/features/vault/vault-auto-lock-notice";
import { VaultLayoutShell } from "@/features/vault/vault-layout-shell";
import { NoteSearchProvider } from "@/features/notes/note-search-context";
import { VoiceWarmup } from "@/features/voice/voice-warmup";

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return (
    <NoteSearchProvider>
      <SiteShell hideFooter>
        <VoiceWarmup />
        <VaultAutoLockNotice />
        <VaultLayoutShell>{children}</VaultLayoutShell>
      </SiteShell>
    </NoteSearchProvider>
  );
}
