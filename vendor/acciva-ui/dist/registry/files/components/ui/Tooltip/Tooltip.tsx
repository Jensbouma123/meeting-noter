"use client";

import { isValidElement, useCallback, useContext, useId, useRef, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { assignRef } from "@/components/ui/Tooltip/refs";
import { TooltipGroupContext } from "@/components/ui/Tooltip/groupApi";
import { TooltipBubble } from "@/components/ui/Tooltip/TooltipBubble";
import type { TooltipChildProps, TooltipProps, TooltipSlot } from "@/components/ui/Tooltip/types";
import { useGroupSlot } from "@/components/ui/Tooltip/useGroupSlot";
import { useTriggerHandlers } from "@/components/ui/Tooltip/useTriggerHandlers";
import { useTooltipOpen } from "@/components/ui/Tooltip/useTooltipOpen";

export function Tooltip({ content, children, side = "top", delay = 0, maxWidth = 280, longPress = true }: TooltipProps) {
  const tooltipId = useId();
  // Unique per instance: the trigger declares it, the bubble anchors to it (useId characters are not dashed-ident safe).
  const anchorName = `--tooltip-${tooltipId.replace(/[^\w-]/g, "")}`;
  const triggerRef = useRef<HTMLElement | null>(null);
  const group = useContext(TooltipGroupContext);
  const [open, show, hide, leave, touch, touchOpenRef, owner] = useTooltipOpen(delay, longPress, triggerRef, group?.warm);
  const slot: TooltipSlot = { owner, id: tooltipId, anchorName, content, side, maxWidth, triggerRef, hide, touchOpenRef };
  // Inside a TooltipGroup the group renders the one shared bubble; this instance only feeds it.
  useGroupSlot(group, open, slot);
  // Read before the early return so the hook runs on every render; the handlers are unused when `children` is not an element.
  const childProps = (isValidElement(children) ? children.props : {}) as TooltipChildProps;
  const eventHandlers = useTriggerHandlers(childProps, show, hide, leave, touch);
  // Stable ref callbacks: an inline one is detached and re-attached on every render, in tree order,
  // so in a hand-off to an earlier trigger the old trigger's ref would still be null when the new
  // one publishes, and the group could not measure where the bubble glides from.
  const childRef = childProps.ref;
  const setChild = useCallback((node: HTMLElement | null) => assignRef(childRef, node), [childRef]);
  const setTrigger = useCallback(
    (node: HTMLElement | null) => {
      triggerRef.current = node;
      assignRef(childRef, node);
    },
    [childRef],
  );
  const setWrapper = useCallback((node: HTMLElement | null) => {
    triggerRef.current = node;
  }, []);

  if (!isValidElement(children)) return children;

  const child = children as ReactElement<Record<string, unknown>>;
  // A grouped trigger keeps its anchor while mounted: the hand-off commit closes the old Tooltip
  // before the group re-renders its bubble, which must stay anchored there to be measured.
  const anchorStyle = open || group ? ({ anchorName } as CSSProperties) : undefined;
  const TriggerComponent = child.type as React.ElementType;
  const isDisabled = Boolean(childProps.disabled);

  let trigger: ReactNode;

  if (isDisabled) {
    trigger = (
      <span
        ref={setWrapper}
        tabIndex={0}
        aria-describedby={open ? tooltipId : undefined}
        style={anchorStyle}
        className="inline-flex cursor-not-allowed"
        {...eventHandlers}
      >
        <TriggerComponent
          {...childProps}
          key={child.key}
          ref={setChild}
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
        ref={setTrigger}
        aria-describedby={open ? tooltipId : undefined}
        style={{ ...(childProps.style as CSSProperties | undefined), ...anchorStyle }}
        {...eventHandlers}
      />
    );
  }

  return (
    <>
      {trigger}
      {open && !group ? <TooltipBubble {...slot} /> : null}
    </>
  );
}
