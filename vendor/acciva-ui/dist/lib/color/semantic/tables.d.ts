import type { ThemeMode } from "../types.js";
import type { BorderRole, ForegroundRole } from "./types.js";
/**
 * Dark-mode elevation ladder (ALGORITHMS.md §7). Depth in dark mode is carried
 * by lightness, never by shadow, and the base canvas is never pure black.
 */
export declare const ELEVATION_L: readonly number[];
export type ModeScale = {
    readonly elevation: readonly number[];
    readonly inverseBackground: number;
    readonly foreground: Readonly<Record<ForegroundRole, number>>;
    readonly border: Readonly<Record<Exclude<BorderRole, "focus" | "focusOffset">, number>>;
    readonly accent: {
        readonly base: number;
        readonly hover: number;
        readonly active: number;
        readonly subtle: number;
    };
    readonly status: {
        readonly base: number;
        readonly subtle: number;
        readonly border: number;
    };
};
/**
 * Designer intent per mode, in OKLCH lightness. Every gated role is snapped by
 * `solvedEntry` to the nearest step that actually clears its AA floor, so these
 * numbers say where the role wants to sit, not where it lands. They are chosen
 * close enough to a conforming step that the solver rarely has to move one —
 * which is what keeps `border.default` and `border.strong` from collapsing onto
 * the same step when both are pulled toward the same limit.
 *
 * Dark accents lighten into L 0.75-0.85 (ALGORITHMS.md §7); the ramp's chroma
 * curve desaturates them there, so no extra chroma handling is needed here.
 *
 * `border.focus` is not listed: it tracks `accent.base`, so the focus ring is
 * the brand accent rather than a fifth neutral. `border.focusOffset` tracks the
 * 01dp elevation, because the inner ring reads as the surface the control sits
 * on.
 */
export declare const SCALES: Readonly<Record<ThemeMode, ModeScale>>;
