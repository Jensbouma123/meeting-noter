import type { VirtualListRole } from "./types.js";
export declare const DEFAULT_HEIGHT = 400;
export declare const DEFAULT_OVERSCAN = 4;
export declare const DEFAULT_SCROLL_TO_TOP_THRESHOLD = 100;
export declare const SCROLL_TO_TOP_EXTRA_SPACE = 56;
export declare const MEASUREMENT_EPSILON = 0.5;
/**
 * Hysteresis band for the docked (full-width) scroll-to-top state. A single
 * threshold makes momentum and trackpad scrolls flip the state every frame
 * around the boundary, restarting the width transition mid-flight; entering at
 * 24px and only leaving past 48px latches the state through that noise.
 */
export declare const SCROLL_TO_TOP_DOCK_ENTER_DISTANCE = 24;
export declare const SCROLL_TO_TOP_DOCK_EXIT_DISTANCE = 48;
/**
 * `aria-activedescendant` is only defined on composite widget roles. Setting it
 * on `list`/`rowgroup`/`presentation` is invalid ARIA that AT ignores, so those
 * roles keep the visual roving highlight without the attribute.
 */
export declare const ACTIVEDESCENDANT_ROLES: ReadonlySet<VirtualListRole>;
