"use client";
import { createContext } from "react";
import { visibleRect } from "./visibleRect.js";
/** The nearest TooltipGroup, or `null` when a Tooltip stands alone. */
export const TooltipGroupContext = createContext(null);
/**
 * The group's channel. A hand-off is a publish from another owner while the bubble is still
 * mounted: the old rect, arrow, side and text are captured here, before React swaps them.
 */
export function createGroupApi(setState) {
    const bubbleRef = { current: null };
    const skipDelayRef = { current: 300 };
    let last = null;
    let closedAt = Number.NEGATIVE_INFINITY;
    const api = {
        warm: () => bubbleRef.current !== null || Date.now() - closedAt < skipDelayRef.current,
        publish(slot) {
            const bubble = bubbleRef.current;
            const prev = bubble && last && last.owner !== slot.owner ? visibleRect(bubble) : null;
            const from = bubble && prev
                ? {
                    rect: prev,
                    arrow: getComputedStyle(bubble).getPropertyValue("--tooltip-arrow").trim() || "50%",
                    placed: bubble.dataset.placed,
                    content: last?.content,
                }
                : null;
            last = slot;
            setState((s) => (from ? { slot, from, seq: s.seq + 1 } : { ...s, slot }));
        },
        clear(owner) {
            if (last?.owner !== owner)
                return;
            closedAt = Date.now();
            setState((s) => (s.slot?.owner === owner ? { slot: null, from: null, seq: s.seq } : s));
        },
        settle: () => setState((s) => (s.from ? { ...s, from: null } : s)),
    };
    return { api, bubbleRef, skipDelayRef };
}
