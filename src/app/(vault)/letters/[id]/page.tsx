"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField } from "@/components/ui/form-field";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { SuccessState } from "@/components/ui/success-state";
import { lettersApi } from "@/lib/api-client/letters";
import { encryptLetter, decryptLetter } from "@/lib/crypto-client/letters";
import { subscribeVaultSession } from "@/lib/crypto-client/vault-session";
import { useRequireVault } from "@/features/vault/use-require-vault";
import { VaultAccessGate } from "@/features/vault/vault-access-gate";

export default function LetterDetailPage() {
  const vault = useRequireVault();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canRead = vault.status === "ready" && vault.vaultUnlocked;
  const vaultUserId = vault.status === "ready" ? vault.userId : null;

  useEffect(() => {
    return subscribeVaultSession(() => {
      setTitle("");
      setBody("");
      setEditing(false);
      setError(null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!canRead || !vaultUserId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const letter = await lettersApi.get(id);
        const decrypted = await decryptLetter(
          letter.encryptedTitle,
          letter.encryptedBody,
          letter.encryptedLetterKey
        );
        if (!cancelled) {
          setTitle(decrypted.title);
          setBody(decrypted.body);
          setAnswered(letter.answered);
          setCreatedAt(letter.createdAt);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load letter");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [canRead, vaultUserId, id]);

  function handleAccessGranted() {
    vault.recheckVault();
    setLoading(true);
  }

  async function handleSave() {
    if (vault.status !== "ready") return;
    setSaving(true);
    setError(null);
    try {
      const payload = await encryptLetter(vault.userId, id, title, body);
      await lettersApi.update(id, payload);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkAnswered() {
    setSaving(true);
    try {
      await lettersApi.update(id, { answered: true });
      setAnswered(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await lettersApi.delete(id);
      router.push("/letters");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (vault.status === "loading" || vault.status === "redirecting") {
    return (
      <PageLayout>
        <LoadingState label="Opening your letter" />
      </PageLayout>
    );
  }

  if (vault.status === "error") {
    return (
      <PageLayout>
        <ErrorState message={vault.message} />
      </PageLayout>
    );
  }

  if (!canRead) {
    return (
      <PageLayout>
        <Card>
          <VaultAccessGate purpose="read" onAccessGranted={handleAccessGranted} />
        </Card>
      </PageLayout>
    );
  }

  if (loading) {
    return (
      <PageLayout>
        <LoadingState label="Opening your letter" />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="mb-6">
        <Link href="/letters" className="text-sm font-medium text-[var(--primary)] hover:underline">
          ← Back to my letters
        </Link>
      </div>

      {editing ? (
        <Card className="space-y-5">
          <FormField id="edit-title" label="Title">
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </FormField>
          <FormField id="edit-body" label="Your letter">
            <Textarea id="edit-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={20000} />
          </FormField>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : (
        <article className="space-y-6">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {answered && <Badge variant="success">Answered</Badge>}
            </div>
            {createdAt && (
              <p className="text-sm text-[var(--muted)]">
                Written{" "}
                {new Date(createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
          </header>

          <Card muted className="p-6">
            <div className="whitespace-pre-wrap text-base leading-relaxed text-[var(--foreground)]">{body}</div>
          </Card>

          {answered && (
            <SuccessState message="You marked this letter as answered in your journey." />
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit
            </Button>
            {!answered && (
              <Button variant="secondary" onClick={handleMarkAnswered} disabled={saving}>
                Mark as answered
              </Button>
            )}
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              Delete letter
            </Button>
          </div>
        </article>
      )}

      {error && (
        <div className="mt-4">
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this letter?"
        description="This permanently removes the letter. This cannot be undone."
        confirmLabel="Delete letter"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </PageLayout>
  );
}
