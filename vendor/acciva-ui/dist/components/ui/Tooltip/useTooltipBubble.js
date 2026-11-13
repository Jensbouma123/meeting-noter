import { useEffect, useState } from "react";
import { measurePlacement } from "./placement.js";
/**
 * Manual popover lifecycle for a mounted (open) bubble: shows it in the top layer, tracks the
 * side it landed on, and dismisses on Escape, outside press, or scroll. Re-runs when the bubble is
 * handed to another anchor (`anchorName`, TooltipGroup). Returns the placed side and `sync`, which
 * re-measures it (skipped while a group morph owns the arrow, `data-morph`).
 */
export function useTooltipBubble(side, anchorName, triggerRef, tooltipRef, hide, touchOpenRef) {
    const [placed, setPlaced] = useState(side);
    const sync = () => {
        const bubble = tooltipRef.current;
        const trigger = triggerRef.current;
        if (!bubble || !trigger || bubble.hasAttribute("data-morph"))
            return null;
        const next = measurePlacement(bubble, trigger);
        setPlaced(next?.placed ?? side);
        if (next)
            bubble.style.setProperty("--tooltip-arrow", next.arrow);
        return next;
    };
    // Manual popover: top layer without light dismiss (Escape/outside press are handled below).
    // Anchor positioning follows the trigger on scroll/resize, so no measuring is needed.
    useEffect(() => {
        const bubble = tooltipRef.current;
        if (bubble?.showPopover && !bubble.matches(":popover-open"))
            bubble.showPopover();
        sync();
        // Safari resolves the anchored position (and any position-try fallback) a frame after showPopover().
        let frame = requestAnimationFrame(() => {
            sync();
            frame = requestAnimationFrame(sync);
        });
        const handlePointerDown = (e) => {
            if (!tooltipRef.current?.contains(e.target))
                hide();
        };
        const handleKeyDown = (e) => {
            if (e.key === "Escape")
                hide();
        };
        // A touch-opened label would drift from its finger-held trigger, so scrolling dismisses it.
        const handleScroll = () => {
            if (touchOpenRef.current)
                hide();
        };
        window.addEventListener("scroll", handleScroll, true);
        window.addEventListener("scroll", sync, { capture: true, passive: true });
        window.addEventListener("resize", sync);
        window.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("scroll", handleScroll, true);
            window.removeEventListener("scroll", sync, true);
            window.removeEventListener("resize", sync);
            window.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("keydown", handleKeyDown);
        };
        // The refs are stable and `hide` only closes over stable state, so the effect re-runs only when
        // the bubble moves to another side or anchor (a group hand-off brings a new `hide` with it).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [side, anchorName]);
    return [placed, sync];
}
