import { type RefObject } from "react";
/** Below when `needed` (the popover's block size plus margins) fits under the anchor, else the side
 * with more room (ties below). Halves alone sent a list over the fields above it in a centred dialog. */
export declare function openSide(anchor: DOMRect, viewportHeight: number, needed: number): "top" | "bottom";
/**
 * Shows the popover (it is measured, so it must be laid out before the first paint) and sets
 * `data-side` from `openSide`, on open and on scroll/resize (one read per frame). WebKit ignores
 * `position-try-order: most-block-size` and a viewport-clamped popover always "fits", so CSS alone
 * never flipped there; deciding here keeps engines alike. `active` gates a popover rendered only
 * while open (DropdownMenu); the callers' own `showPopover()` effects then see it open and skip.
 */
export declare function useOpenSide(popoverRef: RefObject<HTMLElement | null>, active?: boolean): void;
