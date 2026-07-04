/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useNoteAttachments } from "@/features/notes/use-note-attachments";
import { encryptedPayload, NOTE_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
}));

vi.mock("@/lib/api-client/note-attachments", () => ({
  noteAttachmentsApi: {
    list: mocks.list,
    create: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("useNoteAttachments", () => {
  it("does not re-fetch forever when the caller passes a new owner object every render", async () => {
    mocks.list.mockResolvedValue({ attachments: [] });
    const wrappedKey = encryptedPayload("note_key", NOTE_ID);

    // Mirrors how JSX callers pass `owner={{ kind: "note", id }}` inline —
    // a fresh object reference on every render.
    const { rerender } = renderHook(
      () =>
        useNoteAttachments({
          owner: { kind: "note", id: NOTE_ID },
          userId: "user-1",
          wrappedKey,
          enabled: true,
        }),
      { initialProps: {} }
    );

    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(1));

    for (let i = 0; i < 5; i++) {
      rerender({});
    }

    // Give any runaway effect loop a chance to fire before asserting it didn't.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mocks.list).toHaveBeenCalledTimes(1);
  });

  it("does not re-fetch when wrappedKey is a new object reference with the same ciphertext", async () => {
    mocks.list.mockResolvedValue({ attachments: [] });
    const wrappedKey = encryptedPayload("note_key", NOTE_ID);

    const { rerender } = renderHook(
      ({ keyRef }: { keyRef: typeof wrappedKey }) =>
        useNoteAttachments({
          owner: { kind: "note", id: NOTE_ID },
          userId: "user-1",
          wrappedKey: keyRef,
          enabled: true,
        }),
      { initialProps: { keyRef: wrappedKey } }
    );

    await waitFor(() => expect(mocks.list.mock.calls.length).toBeGreaterThan(0));
    const callsBeforeRerender = mocks.list.mock.calls.length;

    rerender({ keyRef: { ...wrappedKey } });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mocks.list.mock.calls.length).toBe(callsBeforeRerender);
  });
});
