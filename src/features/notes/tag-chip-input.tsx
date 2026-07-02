"use client";

import { useCallback, useRef, useState } from "react";
import { NoteTagChip } from "@/components/notes/note-labels";
import {
  MAX_TAG_LENGTH,
  normalizeTagInput,
  normalizeTagList,
} from "@/lib/notes/tag-normalization";
import type { VaultTag } from "@/lib/crypto-client/vault-index-types";

interface TagChipInputProps {
  id?: string;
  tags: VaultTag[];
  tagIds: string[];
  onTagIdsChange: (tagIds: string[]) => void;
  onCreateTag: (name: string) => Promise<VaultTag>;
}

function findTagByName(tags: VaultTag[], name: string): VaultTag | undefined {
  const key = name.toLowerCase();
  return tags.find((tag) => tag.name.toLowerCase() === key);
}

export function TagChipInput({
  id = "note-tags-input",
  tags,
  tagIds,
  onTagIdsChange,
  onCreateTag,
}: TagChipInputProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurCommitRef = useRef(false);

  const selectedTags = tagIds
    .map((tagId) => tags.find((tag) => tag.id === tagId))
    .filter((tag): tag is VaultTag => Boolean(tag));

  const addTagIds = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const merged = [...tagIds];
      for (const nextId of ids) {
        if (!merged.includes(nextId)) merged.push(nextId);
      }
      onTagIdsChange(merged);
    },
    [onTagIdsChange, tagIds]
  );

  const commitValues = useCallback(
    async (values: string[], keepFocus: boolean) => {
      if (values.length === 0) return;

      setBusy(true);
      setError(null);
      try {
        const createdIds: string[] = [];

        for (const value of values) {
          const existing = findTagByName(tags, value);
          if (existing) {
            createdIds.push(existing.id);
            continue;
          }

          const created = await onCreateTag(value);
          createdIds.push(created.id);
        }

        addTagIds(createdIds);
        setInput("");
        if (keepFocus) {
          skipBlurCommitRef.current = true;
        }
      } catch {
        setError("Could not save tag. Try again.");
      } finally {
        setBusy(false);
        if (keepFocus) {
          queueMicrotask(() => inputRef.current?.focus());
        }
      }
    },
    [addTagIds, onCreateTag, tags]
  );

  async function commitInput(raw: string, keepFocus: boolean) {
    const bulk = /[,;\n]/.test(raw);
    const values = bulk ? normalizeTagList(raw) : [normalizeTagInput(raw)].filter(Boolean) as string[];

    if (values.length === 0) {
      const trimmed = raw.replace(/#/g, "").trim();
      if (trimmed) {
        if (trimmed.length > MAX_TAG_LENGTH) {
          setError(`Tags must be ${MAX_TAG_LENGTH} characters or fewer after normalization.`);
        } else {
          setError("Enter a valid tag name.");
        }
      }
      return;
    }

    await commitValues(values, keepFocus);
  }

  function removeTag(tagId: string) {
    onTagIdsChange(tagIds.filter((id) => id !== tagId));
    setError(null);
  }

  function removeLastTag() {
    if (tagIds.length === 0) return;
    onTagIdsChange(tagIds.slice(0, -1));
    setError(null);
  }

  return (
    <div className="space-y-2">
      <div
        className="flex min-h-11 flex-wrap items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2"
        onClick={() => inputRef.current?.focus()}
      >
        {selectedTags.map((tag) => (
          <NoteTagChip key={tag.id} name={tag.name} onRemove={() => removeTag(tag.id)} />
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={input}
          aria-label="Add tags"
          aria-describedby={error ? `${id}-error` : undefined}
          placeholder={selectedTags.length === 0 ? "Type a tag and press Space" : ""}
          className="min-w-[8rem] flex-1 bg-transparent text-sm outline-none"
          onChange={(event) => {
            const next = event.target.value.replace(/#/g, "");
            setInput(next);
            if (error) setError(null);
          }}
          onKeyDown={async (event) => {
            if (event.key === "Backspace" && input === "") {
              event.preventDefault();
              removeLastTag();
              return;
            }

            if (event.key === "Tab") {
              if (input.trim()) {
                event.preventDefault();
                await commitInput(input, true);
              }
              return;
            }

            if (
              event.key === " " ||
              event.key === "Enter" ||
              event.key === "ArrowRight"
            ) {
              if (!input.trim()) return;
              event.preventDefault();
              await commitInput(input, true);
            }
          }}
          onBlur={async () => {
            if (skipBlurCommitRef.current) {
              skipBlurCommitRef.current = false;
              return;
            }
            if (input.trim()) {
              await commitInput(input, false);
            }
          }}
          onPaste={async (event) => {
            const pasted = event.clipboardData.getData("text");
            if (!/[,;\n]/.test(pasted)) return;

            event.preventDefault();
            await commitInput(pasted, true);
          }}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-[var(--muted)]">
        Tags are one word, normalized automatically, and shown with #. Max {MAX_TAG_LENGTH} characters.
      </p>
    </div>
  );
}
