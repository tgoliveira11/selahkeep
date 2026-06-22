"use client";

import { NoteAttachmentsField } from "@/features/notes/note-attachments-field";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

interface NoteAttachmentsReadOnlyProps {
  noteId: string;
  userId: string;
  wrappedKey: EncryptedPayload;
}

/** Encrypted attachments on note detail — visible only while vault is unlocked. */
export function NoteAttachmentsReadOnly({
  noteId,
  userId,
  wrappedKey,
}: NoteAttachmentsReadOnlyProps) {
  return (
    <div className="mt-6" data-testid="note-attachments-readonly">
      <NoteAttachmentsField
        noteId={noteId}
        userId={userId}
        wrappedKey={wrappedKey}
        enabled
        readOnly
      />
    </div>
  );
}
