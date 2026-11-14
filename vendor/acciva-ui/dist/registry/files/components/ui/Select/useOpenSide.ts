import { useLayoutEffect, type RefObject } from "react";

/** Side with more block room around the anchor, as the UA `::picker(select)`; ties open below. */
export function openSide(anchor: DOMRect, viewportHeight: number): "top" | "bottom" {
  return anchor.top > viewportHeight - anchor.bottom ? "top" : "bottom";
}

/** The element whose `anchor-name` the popover's `position-anchor` names (the trigger), else the
 * popover's parent. The wrapper can sit elsewhere than the trigger (a fixed or sticky trigger). */
function anchorOf(popover: HTMLElement): HTMLElement | null {
  const parent = popover.parentElement;
  const name = popover.style.getPropertyValue("position-anchor");
  if (!parent || !name) return parent;
  for (const el of parent.querySelectorAll<HTMLElement>("[style]")) {
    if (el.style.getPropertyValue("anchor-name") === name) return el;
  }
  return parent;
}

/**
 * Sets `data-side` on a `.select-list` popover from the room around its anchor (`anchorOf`), on mount and on
 * scroll/resize (one read per frame). WebKit ignores `position-try-order: most-block-size`, so
 * CSS alone opened the list below there and above in Chromium; measuring keeps engines alike.
 */
export function useOpenSide(popoverRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    let frame = 0;
    const place = () => {
      frame = 0;
      const popover = popoverRef.current;
      const anchor = popover && anchorOf(popover);
      if (!popover || !anchor) return;
      popover.dataset.side = openSide(anchor.getBoundingClientRect(), document.documentElement.clientHeight);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(place);
    };
    place();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, { capture: true });
    };
  }, [popoverRef]);
}
