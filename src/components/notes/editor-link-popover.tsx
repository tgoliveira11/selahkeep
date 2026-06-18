"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function isSafeHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

interface EditorLinkPopoverProps {
  initialUrl?: string;
  onApply: (url: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function EditorLinkPopover({
  initialUrl = "",
  onApply,
  onRemove,
  onClose,
}: EditorLinkPopoverProps) {
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      onRemove();
      onClose();
      return;
    }
    if (!isSafeHttpUrl(trimmed)) {
      setError("Use a link starting with http:// or https://");
      return;
    }
    onApply(trimmed);
    onClose();
  }

  return (
    <div
      ref={panelRef}
      className="note-editor-link-popover"
      role="dialog"
      aria-labelledby={`${inputId}-label`}
      data-testid="editor-link-popover"
    >
      <form onSubmit={handleSubmit} className="note-editor-link-popover__form">
        <label id={`${inputId}-label`} htmlFor={inputId} className="note-editor-link-popover__label">
          Link URL
        </label>
        <Input
          id={inputId}
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          className="note-editor-link-popover__input"
        />
        {error && (
          <p className="note-editor-link-popover__error" role="alert">
            {error}
          </p>
        )}
        <div className="note-editor-link-popover__actions">
          <Button type="submit" className="min-h-9 px-3 text-xs">
            Apply
          </Button>
          {initialUrl ? (
            <Button
              type="button"
              variant="secondary"
              className="min-h-9 px-3 text-xs"
              onClick={() => {
                onRemove();
                onClose();
              }}
            >
              Remove
            </Button>
          ) : null}
          <Button type="button" variant="secondary" className="min-h-9 px-3 text-xs" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
