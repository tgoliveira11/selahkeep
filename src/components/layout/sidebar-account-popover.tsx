"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const OPEN_DELAY_MS = 280;
const CLOSE_DELAY_MS = 150;

// Popover card is `px-3 py-2.5` with a 1px border, so its cloned avatar
// (the first flex child) sits this far from the card's fixed top/left.
// Subtracting it lines the clone up exactly over the collapsed sidebar avatar.
const AVATAR_LEFT_OFFSET = 13;
const AVATAR_TOP_OFFSET = 11;

interface SidebarAccountPopoverProps {
  email: string;
  initial: string;
  onSignOut: () => void;
  children: ReactNode;
  enabled?: boolean;
}

/** Hover popover for collapsed sidebar account — email, status, and sign out. */
export function SidebarAccountPopover({
  email,
  initial,
  onSignOut,
  children,
  enabled = true,
}: SidebarAccountPopoverProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
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
    const left = rect.left - AVATAR_LEFT_OFFSET;
    const top = rect.top - AVATAR_TOP_OFFSET;
    setPosition({ top: Math.max(12, top), left });
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
        // Sidebar chrome renders inside `.vc-vault-lock-overlay-exclude` (z-index 55,
        // vault-core) so it stays above the vault-lock overlay. This popover must sit
        // above that sidebar, so it needs more than the default --z-toolbar-popover (40).
        className="fixed z-[56] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 shadow-[var(--shadow-md)]"
        style={{ top: position.top, left: position.left, width: 280 }}
        data-testid="sidebar-account-popover"
        onMouseEnter={keepOpen}
        onMouseLeave={scheduleClose}
      >
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-[linear-gradient(150deg,var(--accent),var(--primary-solid))] text-xs font-semibold text-white"
          >
            {initial}
          </span>
          <div className="min-w-0 flex-1 text-[12.5px]">
            <div className="truncate font-medium text-[var(--fg-2)]">{email}</div>
            <div className="text-[11px] text-[var(--muted)]">Signed in</div>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            className="flex-none rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--card-2)] hover:text-[var(--foreground)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div
      ref={anchorRef}
      className="inline-flex"
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
    >
      {children}
      {mounted && popover ? createPortal(popover, document.body) : null}
    </div>
  );
}
