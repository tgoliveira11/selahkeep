"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ToolbarButton } from "@/components/ui/toolbar-button";
import { cn } from "@/lib/ui/cn";

interface ToolbarMenuProps {
  label: string;
  testId?: string;
  active?: boolean;
  align?: "start" | "end";
  variant?: "primary" | "secondary";
  icon?: React.ReactNode;
  children: React.ReactNode;
}

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** Compact toolbar dropdown — panel portals above page content to avoid clipping. */
export function ToolbarMenu({
  label,
  testId,
  active = false,
  align = "end",
  variant = "secondary",
  icon,
  children,
}: ToolbarMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const mounted = useMounted();
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const left = align === "end" ? rect.right : rect.left;
    setPanelStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left,
      transform: align === "end" ? "translateX(-100%)" : undefined,
      minWidth: "14rem",
      maxWidth: "min(20rem, calc(100vw - 1rem))",
    });
  }, [align]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition, children]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    }
    function onReposition() {
      updatePosition();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, close, updatePosition]);

  const panel = open && mounted ? (
    <div
      id={panelId}
      ref={panelRef}
      role="menu"
      className="toolbar-menu-panel"
      style={panelStyle}
      data-testid={testId ? `${testId}-panel` : undefined}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  ) : null;

  return (
    <div className="toolbar-menu shrink-0">
      <ToolbarButton
        ref={triggerRef}
        label={label}
        testId={testId}
        active={active}
        primary={variant === "primary"}
        hasMenu
        icon={icon}
        ariaExpanded={open}
        ariaControls={panelId}
        onClick={() => setOpen((value) => !value)}
      />
      {panel && createPortal(panel, document.body)}
    </div>
  );
}
