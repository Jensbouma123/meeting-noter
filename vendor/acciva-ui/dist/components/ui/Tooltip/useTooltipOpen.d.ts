import { type RefObject } from "react";
/**
 * Open state and its timers: hover/focus reveal after `delay` (skipped while `warm()` is true, i.e.
 * a `TooltipGroup` hand-off), press-and-hold for touch, and hide. Opening closes any other tooltip.
 */
export declare function useTooltipOpen(delay: number, longPress: boolean, triggerRef: RefObject<HTMLElement | null>, warm?: () => boolean): readonly [boolean, () => void, () => void, () => void, {
    onPointerDown: (e: import("react").PointerEvent<Element>) => void;
    onPointerMove: (e: import("react").PointerEvent<Element>) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    onContextMenu: (e: import("react").MouseEvent<Element>) => void;
    consumeClick: () => boolean;
}, RefObject<boolean>, {}];
