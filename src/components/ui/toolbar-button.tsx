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
  iconOnly?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  ariaExpanded?: boolean;
  ariaControls?: string;
  disabled?: boolean;
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
      iconOnly = false,
      onClick,
      type = "button",
      ariaExpanded,
      ariaControls,
      disabled = false,
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        data-testid={testId}
        disabled={disabled}
        className={cn(
          "toolbar-button",
          primary && "toolbar-button--primary",
          active && "toolbar-button--active",
          iconOnly && "toolbar-button--icon-only"
        )}
        aria-label={label}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
        aria-haspopup={hasMenu ? "menu" : undefined}
        onClick={onClick}
      >
        {icon && <span className="toolbar-button__icon">{icon}</span>}
        <span className={cn("toolbar-button__label", iconOnly && "sr-only")}>{label}</span>
        {hasMenu && !iconOnly && (
          <span className="toolbar-button__chevron" aria-hidden>
            <IconChevronDown />
          </span>
        )}
      </button>
    );
  }
);
