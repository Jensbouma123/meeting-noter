import { type RefObject } from "react";
/** Side with more block room around the anchor, as the UA `::picker(select)`; ties open below. */
export declare function openSide(anchor: DOMRect, viewportHeight: number): "top" | "bottom";
/**
 * Sets `data-side` on a `.select-list` popover from the room around its anchor (`anchorOf`), on mount and on
 * scroll/resize (one read per frame). WebKit ignores `position-try-order: most-block-size`, so
 * CSS alone opened the list below there and above in Chromium; measuring keeps engines alike.
 */
export declare function useOpenSide(popoverRef: RefObject<HTMLElement | null>): void;
