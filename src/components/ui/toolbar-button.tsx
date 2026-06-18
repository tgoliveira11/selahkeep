"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/ui/cn";
import { IconChevronDown } from "@/components/ui/toolbar-icons";

interface ToolbarButtonProps {
  label: string;
  testId?: string;
  active?: boolean;
  primary?: boolean;
  hasMenu?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  ariaExpanded?: boolean;
  ariaControls?: string;
}

/** Compact toolbar control with icon, short label, and optional menu chevron. */
export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  function ToolbarButton(
    {
      label,
      testId,
      active = false,
      primary = false,
      hasMenu = false,
      icon,
      onClick,
      type = "button",
      ariaExpanded,
      ariaControls,
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        data-testid={testId}
        className={cn(
          "toolbar-button",
          primary && "toolbar-button--primary",
          active && "toolbar-button--active"
        )}
        aria-label={label}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
        aria-haspopup={hasMenu ? "menu" : undefined}
        onClick={onClick}
      >
        {icon && <span className="toolbar-button__icon">{icon}</span>}
        <span className="toolbar-button__label">{label}</span>
        {hasMenu && (
          <span className="toolbar-button__chevron" aria-hidden>
            <IconChevronDown />
          </span>
        )}
      </button>
    );
  }
);
