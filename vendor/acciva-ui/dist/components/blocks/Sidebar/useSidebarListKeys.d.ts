import { type KeyboardEvent, type RefObject } from "react";
/**
 * One list's keyboard: roving focus over its links (core, wraps, Home/End) with Alt+Arrow
 * reorder (SC 2.1.1) layered on top. Links stay in the natural tab order (no roving tabindex).
 */
export declare function useSidebarListKeys({ containerRef, list, refs, count, canReorder, queueFocus, move, }: {
    containerRef: RefObject<HTMLUListElement | null>;
    list: "rail" | "drawer";
    refs: RefObject<(HTMLAnchorElement | null)[]>;
    count: number;
    canReorder: boolean;
    queueFocus: (list: "rail" | "drawer", index: number) => void;
    move: (from: number, to: number) => void;
}): (event: KeyboardEvent<HTMLUListElement>) => void;
