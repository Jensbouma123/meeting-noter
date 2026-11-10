import type { BottomNavDrawerProps } from "./types.js";
/**
 * A non-modal drawer behind a `BottomNav`, growing out of the bar's top edge. Collapsed, the
 * handle and peek row show; open, the body. No dialog, no focus trap, no backdrop: the page
 * and the bar stay usable, and the collapsed body is `inert` (SC 2.4.3).
 */
export declare function BottomNavDrawer({ label, children, peek, snap: snapProp, defaultSnap, open, defaultOpen, onOpenChange, halfDetent, onSnapChange, hug, draggable, hideAt, id, className, }: BottomNavDrawerProps): import("react").JSX.Element;
