"use client";

import { useRef, type CSSProperties, type RefObject } from "react";
import { TEXT_SIZE } from "@/lib/sizing-tokens/index";
import { SURFACE_SHADOW } from "@/lib/surface-tokens";
import { cn } from "@/lib/utils";
import { TOOLTIP_FILL } from "@/components/ui/Tooltip/constants";
import type { TooltipSlot } from "@/components/ui/Tooltip/types";
import { useTooltipBubble } from "@/components/ui/Tooltip/useTooltipBubble";
import { useTooltipMorph, type TooltipMorph } from "@/components/ui/Tooltip/useTooltipMorph";

type TooltipBubbleProps = TooltipSlot & {
  bubbleRef?: RefObject<HTMLDivElement | null>;
  /** Set by TooltipGroup: the text sits in cross-fading layers and hand-offs morph the bubble. */
  morph?: TooltipMorph;
};

/** The open bubble: mounted only while shown, so `role="tooltip"` is in the DOM only when visible. */
export function TooltipBubble({ bubbleRef, morph, ...slot }: TooltipBubbleProps) {
  const ownRef = useRef<HTMLDivElement | null>(null);
  const ref = bubbleRef ?? ownRef;
  const { id, anchorName, content, side, maxWidth, triggerRef, hide, touchOpenRef } = slot;
  const [placed, sync] = useTooltipBubble(side, anchorName, triggerRef, ref, hide, touchOpenRef);
  useTooltipMorph(ref, morph, sync);

  return (
    <div
      ref={ref}
      role="tooltip"
      id={id}
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
      {morph ? (
        <div className="tooltip-body">
          {morph.from ? (
            <div className="tooltip-layer" data-layer="out" aria-hidden="true">
              {morph.from.content}
            </div>
          ) : null}
          <div className="tooltip-layer" data-layer="in">
            {content}
          </div>
        </div>
      ) : (
        content
      )}
    </div>
  );
}
