"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/ui/cn";
import {
  QUICK_INSERT_ITEMS,
  type QuickInsertId,
} from "@/lib/notes/quick-insert-snippets";

interface EditorQuickInsertProps {
  onSelect: (id: QuickInsertId) => void;
  disabled?: boolean;
}

export function EditorQuickInsert({ onSelect, disabled }: EditorQuickInsertProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="note-editor-toolbar__quick-insert" ref={rootRef}>
      <button
        type="button"
        className={cn(
          "note-editor-toolbar__btn note-editor-toolbar__btn--insert",
          open && "note-editor-toolbar__btn--active"
        )}
        aria-label="Insert block"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Insert"
        disabled={disabled}
        data-testid="toolbar-quick-insert"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">+</span>
        <span className="note-editor-toolbar__insert-label">Insert</span>
      </button>
      {open ? (
        <div
          className="note-editor-quick-insert-menu"
          role="menu"
          aria-label="Insert block"
          data-testid="quick-insert-menu"
        >
          {QUICK_INSERT_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className="note-editor-quick-insert-menu__item"
              data-testid={`quick-insert-${item.id}`}
              onClick={() => {
                onSelect(item.id);
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
