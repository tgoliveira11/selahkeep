"use client";

import { useCallback, useRef, useState } from "react";
import { NoteTagChip } from "@/components/notes/note-labels";
import {
  MAX_TAG_LENGTH,
  normalizeTagInput,
  normalizeTagList,
} from "@/lib/notes/tag-normalization";

interface KanbanCardTagNamesInputProps {
  id?: string;
  tagNames: string[];
  onTagNamesChange: (tagNames: string[]) => void;
  suggestions?: string[];
}

function findTagByName(tags: string[], name: string): string | undefined {
  const key = name.toLowerCase();
  return tags.find((tag) => tag.toLowerCase() === key);
}

export function KanbanCardTagNamesInput({
  id = "kanban-card-tags-input",
  tagNames,
  onTagNamesChange,
  suggestions = [],
}: KanbanCardTagNamesInputProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurCommitRef = useRef(false);

  const addTagNames = useCallback(
    (names: string[]) => {
      if (names.length === 0) return;
      const merged = [...tagNames];
      for (const name of names) {
        if (!findTagByName(merged, name)) merged.push(name);
      }
      onTagNamesChange(merged);
    },
    [onTagNamesChange, tagNames]
  );

  const commitValues = useCallback(
    (values: string[], keepFocus: boolean) => {
      if (values.length === 0) return;
      addTagNames(values);
      setInput("");
      if (keepFocus) skipBlurCommitRef.current = true;
      if (keepFocus) queueMicrotask(() => inputRef.current?.focus());
    },
    [addTagNames]
  );

  async function commitInput(raw: string, keepFocus: boolean) {
    const bulk = /[,;\n]/.test(raw);
    const values = bulk
      ? normalizeTagList(raw)
      : ([normalizeTagInput(raw)].filter(Boolean) as string[]);

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

    commitValues(values, keepFocus);
  }

  function removeTag(name: string) {
    onTagNamesChange(tagNames.filter((tag) => tag !== name));
    setError(null);
  }

  function removeLastTag() {
    if (tagNames.length === 0) return;
    onTagNamesChange(tagNames.slice(0, -1));
    setError(null);
  }

  const suggestionList = suggestions.filter(
    (name) => !findTagByName(tagNames, name)
  );

  return (
    <div className="space-y-2">
      <div
        className="flex min-h-11 flex-wrap items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2"
        onClick={() => inputRef.current?.focus()}
      >
        {tagNames.map((name) => (
          <NoteTagChip key={name} name={name} onRemove={() => removeTag(name)} />
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={input}
          aria-label="Add tags"
          aria-describedby={error ? `${id}-error` : undefined}
          list={suggestionList.length > 0 ? `${id}-suggestions` : undefined}
          placeholder={tagNames.length === 0 ? "Type a tag and press Space" : ""}
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

            if (event.key === " " || event.key === "Enter" || event.key === "ArrowRight") {
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
        {suggestionList.length > 0 && (
          <datalist id={`${id}-suggestions`}>
            {suggestionList.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-[var(--muted)]">
        Card tags sync to the source note as {"{tag}"} markers when this board is linked to a note.
      </p>
    </div>
  );
}
