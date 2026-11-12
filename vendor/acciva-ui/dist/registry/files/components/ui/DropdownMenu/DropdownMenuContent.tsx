"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { useArrowHint } from "@/lib/use-arrow-hint";
import { SURFACE_FILL, SURFACE_RADIUS, SURFACE_SHADOW } from "@/lib/surface-tokens";
import { cn } from "@/lib/utils";
import { ArrowHint } from "@/lib/ArrowHint";
import { useDropdownMenuContext } from "@/components/ui/DropdownMenu/DropdownMenuContext";
import { useDropdownMenuKeyboard } from "@/components/ui/DropdownMenu/useDropdownMenuKeyboard";

export interface DropdownMenuContentProps extends HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end";
  sideOffset?: number;
  className?: string;
  children?: ReactNode;
  /** First-keyboard-focus caption; `false` disables it. */
  arrowHint?: string | false;
}

export const DropdownMenuContent = forwardRef<HTMLDivElement, DropdownMenuContentProps>(function DropdownMenuContent(
  { align = "start", sideOffset = 4, className, children, arrowHint, style, "aria-describedby": ariaDescribedBy, ...props },
  ref,
) {
  const { open, setOpen, contentId, triggerId, anchorName } = useDropdownMenuContext("DropdownMenuContent");
  const menuRef = useRef<HTMLDivElement>(null);
  const hint = useArrowHint("dropdown-menu", arrowHint, "Use arrow keys to move between items");

  useImperativeHandle(ref, () => menuRef.current as HTMLDivElement);

  // `popover="auto"` puts the menu in the top layer with light dismiss (outside press, Escape) and
  // anchor positioning follows the trigger, so there is no portal, measuring or outside-click listener.
  useEffect(() => {
    const menu = menuRef.current;
    if (!open || !menu) return;
    if (menu.showPopover && !menu.matches(":popover-open")) menu.showPopover();
    const onToggle = (e: Event) => {
      if ((e as ToggleEvent).newState === "closed") setOpen(false);
    };
    menu.addEventListener("toggle", onToggle);
    return () => menu.removeEventListener("toggle", onToggle);
  }, [open, setOpen]);

  const handleKeyDown = useDropdownMenuKeyboard(menuRef);

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      id={contentId}
      role="menu"
      aria-labelledby={triggerId}
      aria-describedby={hint.describedBy(ariaDescribedBy)}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      {...hint.groupProps}
      popover="auto"
      data-align={align}
      style={{ positionAnchor: anchorName, "--dropdown-offset": `${sideOffset}px`, ...style } as CSSProperties}
      className={cn(
        "dropdown-menu min-w-44 p-1.5 text-foreground focus:outline-none",
        SURFACE_FILL.overlay,
        SURFACE_RADIUS.overlay,
        SURFACE_SHADOW.overlay,
        className,
      )}
      {...props}
    >
      {children}
      <ArrowHint id={hint.id} text={hint.text} visible={hint.visible} className="inset-x-1.5 top-auto bottom-1" />
    </div>
  );
});
