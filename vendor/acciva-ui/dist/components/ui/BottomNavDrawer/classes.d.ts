import type { BottomNavDrawerSnap } from "./types.js";
export declare const ROOT_CLASS = "pointer-events-none fixed inset-x-0 bottom-safe-nav z-20";
export declare const PANEL_CLASS: string;
/** Off mid-drag so the panel follows the pointer 1:1; reduced motion snaps (SC 2.3.3). */
export declare const PANEL_MOTION_CLASS = "transition-transform motion-spatial ease-sheet motion-reduce:transition-none";
export declare const HEADER_CLASS = "touch-none";
export declare const HANDLE_CLASS = "focus-ring flex min-h-11 w-full shrink-0 items-center justify-center py-2";
export declare const HANDLE_GRAB_CLASS = "cursor-grab active:cursor-grabbing";
/** `bg-muted-foreground` on `bg-surface` clears 3:1 (SC 1.4.11) — never an `elevation-*` fill. */
export declare const GRIP_CLASS = "h-1.5 w-10 rounded-full bg-muted-foreground";
export declare const PEEK_CLASS = "px-4 pb-2";
export declare const BODY_CLASS = "min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-py-4 px-4 pb-4";
/** Rest translate per snap, in CSS so it is right before hydration and on every resize. */
export declare const SNAP_TRANSLATE: Record<BottomNavDrawerSnap, string>;
