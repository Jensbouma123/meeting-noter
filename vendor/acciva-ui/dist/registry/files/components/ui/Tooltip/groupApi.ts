"use client";

import { createContext, type Dispatch, type SetStateAction } from "react";
import { anchoredRects } from "@/components/ui/Tooltip/anchoredRects";
import { parseTranslate } from "@/components/ui/Tooltip/glideOffset";
import type { TooltipGroupApi, TooltipMorphFrom, TooltipSlot } from "@/components/ui/Tooltip/types";

export interface TooltipGroupState {
  slot: TooltipSlot | null;
  from: TooltipMorphFrom | null;
  seq: number;
}

/** The nearest TooltipGroup, or `null` when a Tooltip stands alone. */
export const TooltipGroupContext = createContext<TooltipGroupApi | null>(null);

/**
 * The group's channel. A hand-off is a publish from another owner while the bubble is still
 * mounted: the old rect, arrow, side and text are captured here, before React swaps them. The rect
 * counts only while the bubble is still anchored to the old trigger (`anchoredRects`).
 */
export function createGroupApi(setState: Dispatch<SetStateAction<TooltipGroupState>>) {
  const bubbleRef: { current: HTMLDivElement | null } = { current: null };
  const skipDelayRef = { current: 300 };
  let last: TooltipSlot | null = null;
  let closedAt = Number.NEGATIVE_INFINITY;
  const api: TooltipGroupApi = {
    warm: () => bubbleRef.current !== null || Date.now() - closedAt < skipDelayRef.current,
    publish(slot) {
      const bubble = bubbleRef.current;
      const prev =
        last && last.owner !== slot.owner ? anchoredRects(bubble, last.triggerRef.current, last.anchorName) : null;
      const style = bubble && prev ? getComputedStyle(bubble) : null;
      const from: TooltipMorphFrom | null =
        bubble && prev && style
          ? {
              rect: prev.bubble,
              trigger: prev.trigger,
              shift: parseTranslate(style.translate),
              arrow: style.getPropertyValue("--tooltip-arrow").trim() || "50%",
              placed: bubble.dataset.placed,
              content: last?.content,
            }
          : null;
      last = slot;
      setState((s) => (from ? { slot, from, seq: s.seq + 1 } : { ...s, slot }));
    },
    clear(owner) {
      if (last?.owner !== owner) return;
      closedAt = Date.now();
      setState((s) => (s.slot?.owner === owner ? { slot: null, from: null, seq: s.seq } : s));
    },
    settle: () => setState((s) => (s.from ? { ...s, from: null } : s)),
  };
  return { api, bubbleRef, skipDelayRef };
}
