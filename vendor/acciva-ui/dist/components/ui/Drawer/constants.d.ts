import type { DrawerLength } from "./types.js";
export declare const FOCUSABLE_SELECTOR = "a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex=\"-1\"])";
export declare const DEFAULT_MAX_HEIGHT: DrawerLength;
/** 24rem — the width `SettingsSheet`/`Sidebar` already use (Tailwind `max-w-sm`). */
export declare const DEFAULT_MAX_WIDTH: DrawerLength;
export declare const MIN_VISIBLE_BACKDROP_PX = 24;
export declare const FLICK_VELOCITY_PX_MS = 0.5;
export declare const FLICK_DISTANCE_THRESHOLD_PX = 30;
export declare const VELOCITY_WINDOW_MS = 100;
export declare const TRANSITION_DURATION_MS = 200;
export declare const PERSISTENT_PEEK_FRACTION = 0.25;
export declare const PERSISTENT_HALF_FRACTION = 0.5;
export declare const DISMISS_SIZE_FRACTION = 0.65;
export declare const DISMISS_TRAVEL_PX = 50;
export declare const FLICK_ORIGIN_TOLERANCE_PX = 20;
/** Matches Tailwind's `md:` breakpoint, where `BottomNav` hides and the panel docks. */
export declare const DOCKED_MEDIA_QUERY = "(min-width: 768px)";
export declare const COARSE_POINTER_QUERY = "(pointer: coarse)";
