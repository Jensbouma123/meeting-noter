"use client";

import { isValidElement, useId, useRef, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { assignRef } from "@/components/ui/Tooltip/refs";
import { TEXT_SIZE } from "@/lib/sizing-tokens/index";
import { SURFACE_SHADOW } from "@/lib/surface-tokens";
import { cn } from "@/lib/utils";
import { TOOLTIP_FILL } from "@/components/ui/Tooltip/constants";
import type { TooltipChildProps, TooltipProps } from "@/components/ui/Tooltip/types";
import { useTooltipBubble } from "@/components/ui/Tooltip/useTooltipBubble";
import { useTriggerHandlers } from "@/components/ui/Tooltip/useTriggerHandlers";
import { useTooltipOpen } from "@/components/ui/Tooltip/useTooltipOpen";

export function Tooltip({ content, children, side = "top", delay = 0, maxWidth = 280, longPress = true }: TooltipProps) {
  const tooltipId = useId();
  // Unique per instance: the trigger declares it, the bubble anchors to it (useId characters are not dashed-ident safe).
  const anchorName = `--tooltip-${tooltipId.replace(/[^\w-]/g, "")}`;
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [open, show, hide, leave, touch, touchOpenRef] = useTooltipOpen(delay, longPress, triggerRef);
  const placed = useTooltipBubble(open, side, triggerRef, tooltipRef, hide, touchOpenRef);
  // Read before the early return so the hook runs on every render; the handlers are unused when `children` is not an element.
  const childProps = (isValidElement(children) ? children.props : {}) as TooltipChildProps;
  const eventHandlers = useTriggerHandlers(childProps, show, hide, leave, touch);

  if (!isValidElement(children)) return children;

  const child = children as ReactElement<Record<string, unknown>>;
  const anchorStyle = open ? ({ anchorName } as CSSProperties) : undefined;
  const TriggerComponent = child.type as React.ElementType;
  const isDisabled = Boolean(childProps.disabled);

  let trigger: ReactNode;

  if (isDisabled) {
    trigger = (
      <span
        ref={(node) => {
          triggerRef.current = node;
        }}
        tabIndex={0}
        aria-describedby={open ? tooltipId : undefined}
        style={anchorStyle}
        className="inline-flex cursor-not-allowed"
        {...eventHandlers}
      >
        <TriggerComponent
          {...childProps}
          key={child.key}
          ref={(node: HTMLElement | null) => {
            assignRef(childProps.ref, node);
          }}
          tabIndex={-1}
          style={{ pointerEvents: "none" }}
        />
      </span>
    );
  } else {
    trigger = (
      <TriggerComponent
        {...childProps}
        key={child.key}
        ref={(node: HTMLElement | null) => {
          triggerRef.current = node;
          assignRef(childProps.ref, node);
        }}
        aria-describedby={open ? tooltipId : undefined}
        style={{ ...(childProps.style as CSSProperties | undefined), ...anchorStyle }}
        {...eventHandlers}
      />
    );
  }

  return (
    <>
      {trigger}
      {open ? (
        <div
          ref={tooltipRef}
          role="tooltip"
          id={tooltipId}
          popover="manual"
          data-side={side}
          data-placed={placed}
          style={
            {
              positionAnchor: anchorName,
              maxWidth: typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth,
            } as CSSProperties
          }
          className={cn(
            "tooltip rounded-lg border border-solid px-3 py-2 font-medium text-foreground break-words whitespace-normal leading-relaxed",
            TEXT_SIZE.xs,
            TOOLTIP_FILL,
            SURFACE_SHADOW.overlay,
          )}
        >
          {content}
        </div>
      ) : null}
    </>
  );
}
