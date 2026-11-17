import { useLayoutEffect, type RefObject } from "react";

/** Below when `needed` (the popover's block size plus margins) fits under the anchor, else the side
 * with more room (ties below). Halves alone sent a list over the fields above it in a centred dialog. */
export function openSide(anchor: DOMRect, viewportHeight: number, needed: number): "top" | "bottom" {
  const below = viewportHeight - anchor.bottom;
  return below < needed && anchor.top > below ? "top" : "bottom";
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

/** The popover's own cap (`--open-side-cap` on it, e.g. Select's 60 steps), or none. */
function ownCap(popover: HTMLElement): number {
  if (!getComputedStyle(popover).getPropertyValue("--open-side-cap").trim()) return Infinity;
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;visibility:hidden;block-size:var(--open-side-cap)";
  popover.append(probe);
  const cap = probe.offsetHeight;
  probe.remove();
  return cap;
}

/** Block size the popover wants, margins included: its content (the inner scroller's full height plus
 * the chrome around it) clamped to its own cap. Read from the current layout, not by switching
 * `position-area`: WebKit does not always re-lay out an anchored popover within the same task. */
function neededHeight(popover: HTMLElement): number {
  const overflows = (el: Element) => el.scrollHeight > el.clientHeight + 1;
  const scroller = overflows(popover) ? popover : [...popover.querySelectorAll("*")].find(overflows) ?? popover;
  const content = popover.offsetHeight - scroller.clientHeight + scroller.scrollHeight;
  const { marginBlockStart, marginBlockEnd } = getComputedStyle(popover);
  return Math.min(content, ownCap(popover)) + (parseFloat(marginBlockStart) || 0) + (parseFloat(marginBlockEnd) || 0);
}

/**
 * Shows the popover (it is measured, so it must be laid out before the first paint) and sets
 * `data-side` from `openSide`, on open and on scroll/resize (one read per frame). WebKit ignores
 * `position-try-order: most-block-size` and a viewport-clamped popover always "fits", so CSS alone
 * never flipped there; deciding here keeps engines alike. `active` gates a popover rendered only
 * while open (DropdownMenu); the callers' own `showPopover()` effects then see it open and skip.
 */
export function useOpenSide(popoverRef: RefObject<HTMLElement | null>, active = true) {
  useLayoutEffect(() => {
    if (!active) return;
    let frame = 0;
    const place = () => {
      frame = 0;
      const popover = popoverRef.current;
      const anchor = popover && anchorOf(popover);
      if (!popover || !anchor) return;
      const viewport = document.documentElement.clientHeight;
      popover.dataset.side = openSide(anchor.getBoundingClientRect(), viewport, neededHeight(popover));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(place);
    };
    const popover = popoverRef.current;
    if (popover?.showPopover && !popover.matches(":popover-open")) popover.showPopover();
    place();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, { capture: true });
    };
  }, [popoverRef, active]);
}
