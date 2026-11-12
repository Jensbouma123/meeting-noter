import type { DrawerLength } from "@/components/ui/Drawer/types";

export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const DEFAULT_MAX_HEIGHT: DrawerLength = "85dvh";
/** 24rem — the width `SettingsSheet`/`Sidebar` already use (Tailwind `max-w-sm`). */
export const DEFAULT_MAX_WIDTH: DrawerLength = 384;
export const MIN_VISIBLE_BACKDROP_PX = 24;
export const FLICK_VELOCITY_PX_MS = 0.5;
export const FLICK_DISTANCE_THRESHOLD_PX = 30;
export const VELOCITY_WINDOW_MS = 100;
export const TRANSITION_DURATION_MS = 200;
export const PERSISTENT_PEEK_FRACTION = 0.25;
export const PERSISTENT_HALF_FRACTION = 0.5;
export const DISMISS_SIZE_FRACTION = 0.65;
export const DISMISS_TRAVEL_PX = 50;
export const FLICK_ORIGIN_TOLERANCE_PX = 20;

/** Matches Tailwind's `md:` breakpoint, where `BottomNav` hides and the panel docks. */
export const DOCKED_MEDIA_QUERY = "(min-width: 768px)";
export const COARSE_POINTER_QUERY = "(pointer: coarse)";
