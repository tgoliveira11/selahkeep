"use client";

import { NoteAttachmentsRail } from "@/components/notes/note-attachments-rail";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

interface NoteAttachmentsReadOnlyProps {
  noteId: string;
  userId: string;
  wrappedKey: EncryptedPayload;
}

/** Encrypted attachments on note detail — delegates to the right-rail card. */
export function NoteAttachmentsReadOnly({
  noteId,
  userId,
  wrappedKey,
}: NoteAttachmentsReadOnlyProps) {
  return (
    <NoteAttachmentsRail
      noteId={noteId}
      userId={userId}
      wrappedKey={wrappedKey}
      enabled
    />
  );
}
