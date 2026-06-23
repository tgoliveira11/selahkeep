"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AttachmentPreview } from "@/components/notes/attachment-preview";
import type { AttachmentMetadataPlaintext } from "@/lib/crypto-client/note-attachments";

const OPEN_DELAY_MS = 280;
const CLOSE_DELAY_MS = 150;

interface AttachmentPreviewPopoverProps {
  metadata: AttachmentMetadataPlaintext;
  loadDecrypted: () => Promise<{ metadata: AttachmentMetadataPlaintext; bytes: Uint8Array }>;
  children: ReactNode;
  enabled?: boolean;
}

/** Hover popover for attachment preview — fixed at 50% of the viewport. */
export function AttachmentPreviewPopover({
  metadata,
  loadDecrypted,
  children,
  enabled = true,
}: AttachmentPreviewPopoverProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 16, left: 16 });
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  const clearTimers = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = window.innerWidth * 0.5;
    const height = window.innerHeight * 0.5;
    let left = rect.left - width - 12;
    if (left < 16) left = 16;
    let top = rect.top;
    if (top + height > window.innerHeight - 16) top = window.innerHeight - height - 16;
    if (top < 16) top = 16;
    setPosition({ top, left });
  }, []);

  const scheduleOpen = useCallback(() => {
    if (!enabled) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (open) return;
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => {
      updatePosition();
      setOpen(true);
    }, OPEN_DELAY_MS);
  }, [enabled, open, updatePosition]);

  const scheduleClose = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, []);

  const keepOpen = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (!open) {
      updatePosition();
      setOpen(true);
    }
  }, [open, updatePosition]);

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

  useEffect(() => clearTimers, [clearTimers]);

  const popover =
    open && mounted ? (
      <div
        className="attachment-preview-popover fixed z-[var(--z-toolbar-popover)] flex flex-col overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-md)]"
        style={{
          top: position.top,
          left: position.left,
          width: "50vw",
          height: "50vh",
        }}
        data-testid="attachment-preview-popover"
        onMouseEnter={keepOpen}
        onMouseLeave={scheduleClose}
      >
        <p className="shrink-0 border-b border-[var(--border)] px-4 py-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          Preview · {metadata.filename}
        </p>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <AttachmentPreview metadata={metadata} loadDecrypted={loadDecrypted} collapsed={false} />
        </div>
      </div>
    ) : null;

  return (
    <div
      ref={anchorRef}
      className="note-detail-rail-list__item"
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
      data-testid="attachment-preview-popover-anchor"
    >
      {children}
      {popover && createPortal(popover, document.body)}
    </div>
  );
}
