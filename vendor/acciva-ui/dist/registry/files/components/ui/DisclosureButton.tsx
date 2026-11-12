"use client";

import { ChevronDown } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import {
  CONTROL_GAP,
  CONTROL_HEIGHT,
  CONTROL_PADDING_X,
  CONTROL_RADIUS,
  ICON_SCALE_CLASS,
  TEXT_SIZE,
  touchTargetClass,
  type SizeTier,
} from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";

export interface DisclosureButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: SizeTier;
  leadingIcon?: ReactNode;
  children?: ReactNode;
}

/**
 * Ghost text trigger with a trailing chevron, for opening a menu, popover or listbox. It owns no
 * open state: `aria-expanded` and `aria-haspopup` pass through from the caller (or a
 * `DropdownMenuTrigger`, which clones the child with them).
 */
export const DisclosureButton = forwardRef<HTMLButtonElement, DisclosureButtonProps>(function DisclosureButton(
  { className, size = "md", leadingIcon, children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "group focus-ring inline-flex items-center rounded-lg font-medium text-muted-foreground transition-colors motion-feedback",
        "hover:bg-elevation-2 hover:text-foreground active:bg-elevation-3",
        "disabled:cursor-not-allowed disabled:opacity-60",
        CONTROL_HEIGHT[size],
        CONTROL_PADDING_X[size],
        CONTROL_RADIUS[size],
        CONTROL_GAP[size],
        TEXT_SIZE[size],
        ICON_SCALE_CLASS[size],
        touchTargetClass(size),
        className,
      )}
      {...props}
    >
      {leadingIcon}
      {children}
      <ChevronDown aria-hidden="true" className="shrink-0 transition-transform motion-feedback group-aria-expanded:rotate-180" />
    </button>
  );
});
