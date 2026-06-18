"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";

export type ResolvedReflectionFields = {
  whatChanged?: string;
  howResolved?: string;
  whatToRemember?: string;
};

interface ResolvedReflectionDialogProps {
  open: boolean;
  loading?: boolean;
  onSaveAndResolve: (fields: ResolvedReflectionFields) => void;
  onResolveWithoutReflection: () => void;
  onCancel: () => void;
}

/** Calm optional prompt when marking a note as resolved. */
export function ResolvedReflectionDialog({
  open,
  loading = false,
  onSaveAndResolve,
  onResolveWithoutReflection,
  onCancel,
}: ResolvedReflectionDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [whatChanged, setWhatChanged] = useState("");
  const [howResolved, setHowResolved] = useState("");
  const [whatToRemember, setWhatToRemember] = useState("");

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  function resetAndCancel() {
    setWhatChanged("");
    setHowResolved("");
    setWhatToRemember("");
    onCancel();
  }

  function resetFields() {
    setWhatChanged("");
    setHowResolved("");
    setWhatToRemember("");
  }

  const fields: ResolvedReflectionFields = {
    whatChanged,
    howResolved,
    whatToRemember,
  };
  const hasContent = Boolean(
    whatChanged.trim() || howResolved.trim() || whatToRemember.trim()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Close dialog"
        onClick={resetAndCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resolved-reflection-title"
        data-testid="resolved-reflection-dialog"
        className="relative w-full max-w-lg rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-lg"
      >
        <h2 id="resolved-reflection-title" className="text-lg font-medium">
          Mark as resolved
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Take a moment to reflect, or resolve without writing anything.
        </p>

        <div className="mt-4 space-y-4">
          <FormField id="what-changed" label="What changed?">
            <Textarea
              id="what-changed"
              data-testid="reflection-what-changed"
              value={whatChanged}
              onChange={(e) => setWhatChanged(e.target.value)}
              rows={2}
              maxLength={2000}
            />
          </FormField>
          <FormField id="how-resolved" label="How was this resolved?">
            <Textarea
              id="how-resolved"
              data-testid="reflection-how-resolved"
              value={howResolved}
              onChange={(e) => setHowResolved(e.target.value)}
              rows={2}
              maxLength={2000}
            />
          </FormField>
          <FormField id="what-remember" label="What do you want to remember?">
            <Textarea
              id="what-remember"
              data-testid="reflection-what-remember"
              value={whatToRemember}
              onChange={(e) => setWhatToRemember(e.target.value)}
              rows={2}
              maxLength={2000}
            />
          </FormField>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Button
            type="button"
            disabled={loading || !hasContent}
            data-testid="save-reflection-resolve"
            onClick={() => {
              onSaveAndResolve(fields);
              resetFields();
            }}
          >
            {loading ? "Saving…" : "Save reflection and resolve"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            data-testid="resolve-without-reflection"
            onClick={() => {
              onResolveWithoutReflection();
              resetFields();
            }}
          >
            Resolve without reflection
          </Button>
          <Button
            ref={cancelRef}
            type="button"
            variant="secondary"
            disabled={loading}
            data-testid="cancel-resolve"
            onClick={resetAndCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
