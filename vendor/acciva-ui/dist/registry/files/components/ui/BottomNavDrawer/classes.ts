import { SURFACE_SHADOW } from "@/lib/surface-tokens";
import type { BottomNavDrawerSnap } from "@/components/ui/BottomNavDrawer/types";

// `pointer-events-none` on the root: its box spans the untranslated panel, so without it the
// empty area above a collapsed drawer would swallow taps meant for the page.
// `bottom-safe-nav` is the SSR anchor; the measured bar height overrides it once known.
export const ROOT_CLASS = "pointer-events-none fixed inset-x-0 bottom-safe-nav z-20";

export const PANEL_CLASS =
  `pointer-events-auto flex max-h-bottom-nav-drawer flex-col overflow-hidden rounded-t-2xl border-t border-border bg-surface text-foreground ${SURFACE_SHADOW.overlay}`;

/** Off mid-drag so the panel follows the pointer 1:1; reduced motion snaps (SC 2.3.3). */
export const PANEL_MOTION_CLASS = "transition-transform motion-spatial ease-sheet motion-reduce:transition-none";

// `touch-none` on the whole handle + peek row: the browser would otherwise claim a vertical
// touch on the row and cancel the pointer drag. The row is not scrollable, so nothing is lost.
export const HEADER_CLASS = "touch-none";

// The same grabber as `Drawer`'s swipe grabber: full width × 44px (SC 2.5.8).
export const HANDLE_CLASS =
  "focus-ring flex min-h-11 w-full shrink-0 items-center justify-center py-2";
export const HANDLE_GRAB_CLASS = "cursor-grab active:cursor-grabbing";

/** `bg-muted-foreground` on `bg-surface` clears 3:1 (SC 1.4.11) — never an `elevation-*` fill. */
export const GRIP_CLASS = "h-1.5 w-10 rounded-full bg-muted-foreground";

export const PEEK_CLASS = "px-4 pb-2";

export const BODY_CLASS = "min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-py-4 px-4 pb-4";

/** Rest translate per snap, in CSS so it is right before hydration and on every resize. */
export const SNAP_TRANSLATE: Record<BottomNavDrawerSnap, string> = {
  peek: "0 calc(100% - var(--bottom-nav-drawer-peek, 2.75rem))",
  half: "0 calc((100% - var(--bottom-nav-drawer-peek, 2.75rem)) / 2)",
  full: "0 0",
};
