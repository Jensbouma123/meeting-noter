import type { ReactNode } from "react";
import type { BottomNavHideAt } from "@/components/ui/BottomNav/BottomNavTypes";

/** `Drawer`'s detent vocabulary: `peek` = collapsed, `half` = middle, `full` = expanded. */
export type BottomNavDrawerSnap = "peek" | "half" | "full";

export interface BottomNavDrawerProps {
  /** Accessible name of the region and of the handle button, e.g. `"Now playing"`. */
  label: string;
  /** The drawer body; `inert` while collapsed. */
  children: ReactNode;
  /** The row shown above the bar while collapsed (and above the body when open). */
  peek?: ReactNode;
  /** Controlled snap; wins over `open`. Lets code drive `peek` → `full`. `half` needs `halfDetent`. */
  snap?: BottomNavDrawerSnap;
  /** Uncontrolled initial snap; wins over `defaultOpen`, ignored when `snap` is passed. */
  defaultSnap?: BottomNavDrawerSnap;
  /** Controlled state; `true` at `half` and `full`. */
  open?: boolean;
  /** Uncontrolled initial state; ignored when `open` is passed. */
  defaultOpen?: boolean;
  /** Fires on every open/collapse from drag, tap or `Escape`. */
  onOpenChange?: (open: boolean) => void;
  /** Adds a middle snap between `peek` and `full`. */
  halfDetent?: boolean;
  /** Peek hugs the measured handle + peek row and `half` is half the hugged `full` (capped by `max-h-bottom-nav-drawer`). */
  hug?: boolean;
  /** `false` disables pointer/touch drag; the handle stays a click/keyboard toggle. Dragging down settles to `peek`, never dismisses. */
  draggable?: boolean;
  /** Fires when a user action settles on a new snap; `height` is the settled panel height in px above the bar. */
  onSnapChange?: (snap: BottomNavDrawerSnap, height: number) => void;
  /** Must match the paired `BottomNav`'s `hideAt`; the drawer hides with the bar. */
  hideAt?: BottomNavHideAt;
  /** Id of the body, wired to the handle's `aria-controls`. */
  id?: string;
  /** Merged onto the root (additive layout only). */
  className?: string;
}
