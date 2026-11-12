import { type RefObject } from "react";
/** Open state and its timers: hover/focus reveal after `delay`, press-and-hold for touch, and hide. */
export declare function useTooltipOpen(delay: number, longPress: boolean, triggerRef: RefObject<HTMLElement | null>): readonly [boolean, () => void, () => void, () => void, {
    onPointerDown: (e: import("react").PointerEvent<Element>) => void;
    onPointerMove: (e: import("react").PointerEvent<Element>) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    onContextMenu: (e: import("react").MouseEvent<Element>) => void;
    consumeClick: () => boolean;
}, RefObject<boolean>];
