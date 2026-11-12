"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { TAB_LIST_GAP, resolveResponsive } from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";
import { INDICATOR, TAB_LIST_FLOW, TAB_LIST_INSET, TAB_LIST_SHELL, TAB_SHAPE } from "@/components/ui/Tabs/tabsClasses";
import { useTabListDrag } from "@/components/ui/Tabs/useTabListDrag";
import { useTabListEffects } from "@/components/ui/Tabs/useTabListEffects";
import { useTabListKeys } from "@/components/ui/Tabs/useTabListKeys";
import { useTabsContext } from "@/components/ui/Tabs/useTabsContext";

export interface TabListProps {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export function TabList({
  children,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: TabListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const { value, setValue, size, variant, orientation, draggable } = useTabsContext("TabList");
  const listInset = TAB_LIST_INSET[variant];
  const horizontal = orientation === "horizontal";
  const canDrag = horizontal && draggable;
  const canIndicate = horizontal;

  const { drag, stopDrag, handlePointerDown, handlePointerMove } = useTabListDrag({
    listRef,
    indicatorRef,
    value,
    setValue,
    variant,
    canDrag,
  });
  useTabListEffects({ listRef, indicatorRef, drag, value, variant, horizontal, canIndicate });
  const handleKeyDown = useTabListKeys({ listRef, horizontal, drag, stopDrag });

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (!ariaLabel && !ariaLabelledBy) {
      console.warn(
        "[a11y] <TabList> has no accessible name. Pass aria-label or aria-labelledby so screen readers can announce what the tabs control.",
      );
    }
  }, [ariaLabel, ariaLabelledBy]);

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-orientation={orientation === "vertical" ? "vertical" : undefined}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={() => stopDrag(true)}
      onPointerCancel={() => stopDrag(false)}
      onContextMenu={(event) => drag.current && event.preventDefault()}
      onLostPointerCapture={(event) => {
        // Only the list's own capture ends the drag; a tab's bubbled release must not.
        if (event.target === event.currentTarget && event.pointerId === drag.current?.id) stopDrag(true);
      }}
      className={cn(
        "inline-flex",
        canDrag && "select-none",
        canIndicate && "group relative",
        TAB_LIST_FLOW[orientation],
        TAB_LIST_SHELL[variant][orientation],
        listInset ? resolveResponsive(size, listInset) : undefined,
        resolveResponsive(size, TAB_LIST_GAP),
        className,
      )}
    >
      {canIndicate && (
        <span
          ref={indicatorRef}
          aria-hidden="true"
          data-indicator=""
          className={cn(
            "pointer-events-none absolute left-0 top-0 w-0 group-data-indicator-ready:motion-spatial group-data-indicator-ready:ease-emphasized group-data-indicator-ready:transition-[transform,width] data-dragging:transition-none",
            INDICATOR[variant],
            variant === "pill" && resolveResponsive(size, TAB_SHAPE.pill!),
          )}
        />
      )}
      {children}
    </div>
  );
}
