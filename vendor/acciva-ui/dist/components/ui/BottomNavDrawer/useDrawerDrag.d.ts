import { type PointerEvent as ReactPointerEvent, type RefObject, type TouchEvent as ReactTouchEvent } from "react";
import type { BottomNavDrawerSnap } from "./types.js";
interface DrawerDragOptions {
    panelRef: RefObject<HTMLElement | null>;
    headerRef: RefObject<HTMLElement | null>;
    order: BottomNavDrawerSnap[];
    snap: BottomNavDrawerSnap;
    commit: (next: BottomNavDrawerSnap) => void;
    /** `false` returns no handlers: the handle button stays the only (click/keyboard) path. */
    enabled?: boolean;
}
/**
 * Pointer drag on the handle + peek row, and the scroll-at-top pull in the body. Works in
 * "visible body px" so `Drawer`'s `pickDetentTarget`/`summarizeDrag` apply unchanged.
 * Returns `offset`: the panel's translate in px mid-drag, `null` at rest (CSS owns it then).
 */
export declare function useDrawerDrag({ panelRef, headerRef, order, snap, commit, enabled }: DrawerDragOptions): {
    offset: null;
    header: {
        onPointerDown?: undefined;
        onPointerMove?: undefined;
        onPointerUp?: undefined;
        onPointerCancel?: undefined;
    };
    body: {
        onTouchStart?: undefined;
        onTouchMove?: undefined;
        onTouchEnd?: undefined;
        onTouchCancel?: undefined;
    };
} | {
    offset: number | null;
    header: {
        onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
        onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
        onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
        onPointerCancel: () => void;
    };
    body: {
        onTouchStart: (event: ReactTouchEvent<HTMLElement>) => void;
        onTouchMove: (event: ReactTouchEvent<HTMLElement>) => void;
        onTouchEnd: () => void;
        onTouchCancel: () => void;
    };
};
export {};
