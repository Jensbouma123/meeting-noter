import { useEffect, useState, type RefObject } from "react";
import type { TooltipSide } from "@/components/ui/Tooltip/types";

/**
 * Manual popover lifecycle: opens the bubble in the top layer, tracks the side it landed on,
 * and dismisses on Escape, outside press, or scroll.
 */
export function useTooltipBubble(
  open: boolean,
  side: TooltipSide,
  triggerRef: RefObject<HTMLElement | null>,
  tooltipRef: RefObject<HTMLDivElement | null>,
  hide: () => void,
  touchOpenRef: RefObject<boolean>,
) {
  // Side the bubble actually landed on after a position-try flip; drives the arrow.
  const [placed, setPlaced] = useState(side);

  // Manual popover: top layer without light dismiss (Escape/outside press are handled below).
  // Anchor positioning follows the trigger on scroll/resize, so no measuring is needed.
  useEffect(() => {
    if (!open) return;
    const bubble = tooltipRef.current;
    if (bubble?.showPopover && !bubble.matches(":popover-open")) bubble.showPopover();
    const syncPlaced = () => {
      const trigger = triggerRef.current;
      if (!bubble || !trigger) return;
      const b = bubble.getBoundingClientRect();
      if (!b.width) return setPlaced(side);
      const t = trigger.getBoundingClientRect();
      const above = b.bottom <= t.top;
      const below = b.top >= t.bottom;
      setPlaced(above ? "top" : below ? "bottom" : b.right <= t.left ? "left" : "right");
      // Arrow offset: trigger centre along the edge the arrow sits on.
      bubble.style.setProperty(
        "--tooltip-arrow",
        `${above || below ? t.x + t.width / 2 - b.x : t.y + t.height / 2 - b.y}px`,
      );
    };
    syncPlaced();
    // Safari resolves the anchored position (and any position-try fallback) a frame after showPopover().
    let frame = requestAnimationFrame(() => {
      syncPlaced();
      frame = requestAnimationFrame(syncPlaced);
    });
    const handlePointerDown = (e: PointerEvent) => {
      if (!tooltipRef.current?.contains(e.target as Node)) hide();
    };
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    // A touch-opened label would drift from its finger-held trigger, so scrolling dismisses it.
    const handleScroll = () => {
      if (touchOpenRef.current) hide();
    };
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("scroll", syncPlaced, { capture: true, passive: true });
    window.addEventListener("resize", syncPlaced);
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("scroll", syncPlaced, true);
      window.removeEventListener("resize", syncPlaced);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
    // The refs are stable and `hide` only closes over stable state, so the effect re-runs only on open/side.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, side]);

  return placed;
}
