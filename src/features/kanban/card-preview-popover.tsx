"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MarkdownPreview } from "@/components/notes/markdown-preview";
import type { KanbanCardPlaintext } from "@/lib/notes/kanban-types";

const OPEN_DELAY_MS = 2000;
const CLOSE_DELAY_MS = 150;

interface KanbanCardPreviewPopoverProps {
  card: KanbanCardPlaintext;
  onOpen: () => void;
  children: ReactNode;
}

export function KanbanCardPreviewPopover({
  card,
  onOpen,
  children,
}: KanbanCardPreviewPopoverProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 16, left: 16, width: 320, height: 120 });
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  const clearTimers = useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setPosition({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }, []);

  const handleEnter = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (open || openTimer.current) return;
    openTimer.current = setTimeout(() => {
      openTimer.current = null;
      updatePosition();
      setOpen(true);
    }, OPEN_DELAY_MS);
  }, [open, updatePosition]);

  const handleLeave = useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      setOpen(false);
    }, CLOSE_DELAY_MS);
  }, []);

  const handleOpen = useCallback(() => {
    clearTimers();
    setOpen(false);
    onOpen();
  }, [clearTimers, onOpen]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return (
    <>
      <div
        ref={anchorRef}
        className={open ? "invisible block w-full" : "block w-full"}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {children}
      </div>
      {mounted &&
        open &&
        createPortal(
          <button
            type="button"
            className="fixed z-50 box-border cursor-pointer overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-3 text-left shadow-[var(--shadow-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              minHeight: position.height,
            }}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            onClick={handleOpen}
            aria-label={`Open card ${card.title}`}
          >
            <p className="text-sm font-semibold tracking-[-0.01em]">{card.title}</p>
            {card.description ? (
              <MarkdownPreview
                markdown={card.description}
                className="mt-2 max-h-48 overflow-y-auto text-xs leading-relaxed text-[var(--fg-2)]"
              />
            ) : (
              <p className="mt-2 text-xs text-[var(--muted)]">No description</p>
            )}
          </button>,
          document.body
        )}
    </>
  );
}
