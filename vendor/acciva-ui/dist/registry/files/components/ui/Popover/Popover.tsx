"use client";

import { isValidElement, useId, useRef, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { SURFACE_SHADOW } from "@/lib/surface-tokens";
import { cn } from "@/lib/utils";
import { assignRef } from "@/components/ui/Popover/assignRef";
import { TOOLTIP_FILL } from "@/components/ui/Popover/constants";
import { PopoverAction, PopoverBody, PopoverHeader } from "@/components/ui/Popover/PopoverParts";
import type { PopoverProps } from "@/components/ui/Popover/types";
import { usePopoverFocus } from "@/components/ui/Popover/usePopoverFocus";
import { usePopoverOpen } from "@/components/ui/Popover/usePopoverOpen";
import { usePopoverPlacement } from "@/components/ui/Popover/usePopoverPlacement";

export function Popover({
  content,
  title,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  onClose,
  dismissOnOutsideClick = false,
  actionLabel,
  onAction,
  placement,
  side,
  children,
  anchorRef,
  maxWidth = 320,
  className,
  animated = true,
}: PopoverProps) {
  const baseId = useId();
  const popoverId = `${baseId}-popover`;
  const titleId = `${baseId}-title`;
  const contentId = `${baseId}-content`;
  // Unique per instance: the trigger declares it, the card anchors to it (useId characters are not dashed-ident safe).
  const anchorName = `--popover-${baseId.replace(/[^\w-]/g, "")}`;

  const internalTriggerRef = useRef<HTMLElement | null>(null);
  const triggerRef = anchorRef ?? internalTriggerRef;
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const targetPlacement = placement ?? side ?? "top";
  const [open, mounted, handleClose, setOpenState] = usePopoverOpen(
    controlledOpen,
    defaultOpen,
    onOpenChange,
    onClose,
    animated,
    popoverRef,
  );
  // Side the card actually landed on after a position-try flip; drives the arrow.
  const placed = usePopoverPlacement(open, mounted, targetPlacement, triggerRef, anchorName, popoverRef);
  const handlePopoverKeyDown = usePopoverFocus(open, triggerRef, popoverRef, handleClose);

  let triggerNode: ReactNode = null;

  if (children && isValidElement(children)) {
    const child = children as ReactElement<Record<string, unknown>>;
    const childProps = child.props as {
      ref?: React.Ref<HTMLElement>;
      onClick?: (e: React.MouseEvent) => void;
    };

    const TriggerComponent = child.type as React.ElementType;

    triggerNode = (
      <TriggerComponent
        {...childProps}
        key={child.key}
        ref={(node: HTMLElement | null) => {
          internalTriggerRef.current = node;
          assignRef(childProps.ref, node);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        // Invoker of an `auto` popover: light dismiss ignores it, so its click is a plain toggle.
        // Declared while closed too: WebKit treats the opening click as an outside click (closing the card at once) unless the trigger is the card's invoker.
        popoverTarget={dismissOnOutsideClick ? popoverId : undefined}
        popoverTargetAction={dismissOnOutsideClick ? "show" : undefined}
        onClick={(e: React.MouseEvent) => {
          childProps.onClick?.(e);
          setOpenState(!open);
        }}
      />
    );
  }

  const resolvedMaxWidth =
    typeof maxWidth === "number"
      ? `min(${maxWidth}px, calc(100vw - 24px))`
      : `min(${maxWidth}, calc(100vw - 24px))`;

  const card = mounted ? (
    <div
      ref={popoverRef}
      role="dialog"
      id={popoverId}
      popover={dismissOnOutsideClick ? "auto" : "manual"}
      tabIndex={-1}
      aria-modal="false"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={contentId}
      onKeyDown={handlePopoverKeyDown}
      // Native light dismiss / Escape hides an `auto` popover without React knowing: sync it back.
      onToggle={(e) => {
        if ((e as unknown as { newState?: string }).newState === "closed" && open) handleClose();
      }}
      data-state={open ? "open" : "closed"}
      data-side={targetPlacement}
      data-placed={placed}
      style={{ positionAnchor: anchorName, maxWidth: resolvedMaxWidth } as CSSProperties}
      className={cn(
        "popover-card rounded-lg border p-3.5 text-foreground leading-relaxed outline-hidden",
        TOOLTIP_FILL,
        SURFACE_SHADOW.overlay,
        animated
          ? "transition-[opacity,scale] motion-spatial ease-emphasized motion-reduce:transition-none"
          : "transition-none",
        !open && "pointer-events-none",
        className,
      )}
    >
      <PopoverHeader title={title} titleId={titleId} onClose={handleClose} />
      <PopoverBody id={contentId} hasTitle={!!title}>
        {content}
      </PopoverBody>
      {actionLabel && <PopoverAction
          label={actionLabel}
          onAction={() => {
            onAction?.();
            handleClose();
          }}
        />}
    </div>
  ) : null;

  return (
    <>
      {triggerNode}
      {card}
    </>
  );
}
