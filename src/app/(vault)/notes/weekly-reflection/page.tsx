"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthenticatedPage } from "@/components/layout/authenticated-page";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { NoteListRow } from "@/components/notes/note-list-row";
import { PromptCards } from "@/components/notes/prompt-cards";
import { NotesVaultProtectedMessage } from "@/features/notes/notes-vault-protected-message";
import { useVaultIndex } from "@/features/notes/use-vault-index";
import { useCategoriesTags } from "@/features/notes/use-categories-tags";
import { useNotes } from "@/features/notes/use-notes";
import { useRequireVault } from "@/features/vault/use-require-vault";
import { useVaultClientStatus } from "@/features/vault/use-vault-client-status";
import {
  buildWeeklyReflectionNoteBody,
  buildWeeklyReflectionSections,
  findCategoryIdByName,
  getLocalWeekBounds,
  WEEKLY_REFLECTION_CATEGORY,
} from "@/lib/notes/weekly-reflection";
import { noteListDisplayProps } from "@/lib/notes/note-list-display";
import { subscribeVaultSession } from "@/lib/crypto-client/vault-session";

function WeeklySection({
  title,
  notes,
  categories,
  tags,
}: {
  title: string;
  notes: import("@/lib/crypto-client/vault-index-types").VaultIndexNoteEntry[];
  categories: import("@/lib/crypto-client/vault-index-types").VaultCategory[];
  tags: import("@/lib/crypto-client/vault-index-types").VaultTag[];
}) {
  return (
    <section className="mb-8" data-testid={`weekly-section-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <h2 className="text-lg font-medium">{title}</h2>
      {notes.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--muted)]">None this week.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {notes.map((note) => (
            <li key={note.id}>
              <NoteListRow {...noteListDisplayProps(note, categories, tags)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function WeeklyReflectionPage() {
  const vault = useRequireVault();
  const vaultClient = useVaultClientStatus();
  const router = useRouter();
  const vaultUserId = vault.status === "ready" ? vault.userId : null;
  const vaultUnlocked = vault.status === "ready" ? vault.vaultUnlocked : false;
  const clientStatus =
    vaultClient.status === "ready" ? vaultClient.clientStatus : null;
  const { index, loading, error } = useVaultIndex(vaultUserId, vaultUnlocked);
  const { categories, tags, createCategory } = useCategoriesTags(vaultUserId, vaultUnlocked);
  const { createNote, busy } = useNotes(vaultUserId);
  const [carryForward, setCarryForward] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const weekBounds = useMemo(() => getLocalWeekBounds(), []);
  const sections = useMemo(
    () =>
      index
        ? buildWeeklyReflectionSections(index.entries, index.categories, weekBounds)
        : null,
    [index, weekBounds]
  );

  useEffect(() => subscribeVaultSession(() => {
    setCarryForward("");
    setCreateError(null);
  }), []);

  const handleCreateWeeklyNote = useCallback(async () => {
    if (!sections || !vaultUserId) return;
    setCreateError(null);
    try {
      let categoryId = findCategoryIdByName(categories, WEEKLY_REFLECTION_CATEGORY);
      if (!categoryId) {
        const newCategory = await createCategory(WEEKLY_REFLECTION_CATEGORY);
        categoryId = newCategory.id;
      }

      const body = buildWeeklyReflectionNoteBody(sections, weekBounds);
      const withCarryForward = carryForward.trim()
        ? `${body}\n\n${carryForward.trim()}`
        : body;

      const note = await createNote({
        title: `Weekly Reflection — ${weekBounds.label}`,
        body: withCarryForward,
        categoryId,
        answered: false,
      });
      router.push(`/notes/${note.id}`);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create weekly reflection note");
    }
  }, [sections, vaultUserId, categories, createCategory, carryForward, weekBounds, createNote, router]);

  if (vault.status === "loading" || vault.status === "redirecting" || vaultClient.status === "loading" || loading) {
    return (
      <AuthenticatedPage width="notes">
        <LoadingState label="Preparing weekly reflection" />
      </AuthenticatedPage>
    );
  }

  if (vault.status === "error" || vaultClient.status === "error") {
    return (
      <AuthenticatedPage width="notes">
        <ErrorState message="Failed to open weekly reflection" />
      </AuthenticatedPage>
    );
  }

  if (clientStatus && clientStatus !== "unlocked") {
    return (
      <AuthenticatedPage width="notes">
        <PageHeader
          title="Weekly reflection"
          description={`Review your week (${weekBounds.label}) after unlocking your vault.`}
        />
        {clientStatus === "locked" && <NotesVaultProtectedMessage />}
      </AuthenticatedPage>
    );
  }

  return (
    <AuthenticatedPage width="notes">
      <div className="mb-6">
        <Link href="/notes" className="text-sm font-medium text-[var(--primary)] hover:underline">
          ← Back to notes
        </Link>
      </div>

      <PageHeader
        title="Weekly reflection"
        description={`Your week in review — ${weekBounds.label} (local time).`}
      />

      {error && (
        <div className="mb-6">
          <ErrorState message={error} />
        </div>
      )}

      {createError && (
        <div className="mb-6">
          <ErrorState message={createError} onRetry={() => setCreateError(null)} />
        </div>
      )}

      <PromptCards
        context="weekly-reflection"
        className="mb-8"
        onInsert={(markdown) => setCarryForward((current) => current + markdown)}
      />

      {sections && (
        <>
          <WeeklySection
            title="Notes created this week"
            notes={sections.createdThisWeek}
            categories={categories}
            tags={tags}
          />
          <WeeklySection
            title="Notes resolved this week"
            notes={sections.resolvedThisWeek}
            categories={categories}
            tags={tags}
          />
          <WeeklySection
            title="Gratitude notes"
            notes={sections.gratitudeNotes}
            categories={categories}
            tags={tags}
          />
          <WeeklySection
            title="Open reflections"
            notes={sections.openReflections}
            categories={categories}
            tags={tags}
          />

          <section className="mb-8" data-testid="weekly-carry-forward">
            <h2 className="text-lg font-medium">What should I carry forward?</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Write what you want to bring into the week ahead. This stays on your device until you save a note.
            </p>
            <textarea
              className="mt-3 w-full min-h-32 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-3 text-sm"
              data-testid="carry-forward-input"
              value={carryForward}
              onChange={(e) => setCarryForward(e.target.value)}
              placeholder="What do you want to remember and carry forward?"
            />
          </section>

          <Button
            type="button"
            disabled={busy}
            data-testid="create-weekly-reflection-note"
            onClick={() => void handleCreateWeeklyNote()}
          >
            {busy ? "Creating…" : "Create weekly reflection note"}
          </Button>
        </>
      )}
    </AuthenticatedPage>
  );
}
