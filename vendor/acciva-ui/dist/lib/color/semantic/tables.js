/**
 * Dark-mode elevation ladder (ALGORITHMS.md §7). Depth in dark mode is carried
 * by lightness, never by shadow, and the base canvas is never pure black.
 */
export const ELEVATION_L = [0.14, 0.17, 0.2, 0.24, 0.28];
/**
 * Light-mode elevation ladder. Lightness saturates at the top of the scale, so
 * the layers above 03dp share it and the remaining separation is carried by the
 * border roles rather than by more lightness.
 */
const LIGHT_ELEVATION_L = [0.93, 0.96, 0.98, 0.98, 0.98];
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
export const SCALES = {
    light: {
        elevation: LIGHT_ELEVATION_L,
        inverseBackground: 0.2,
        foreground: {
            primary: 0.22,
            secondary: 0.4,
            muted: 0.5,
            disabled: 0.72,
            onInverse: 0.98,
        },
        border: { subtle: 0.92, default: 0.58, strong: 0.46 },
        accent: { base: 0.52, hover: 0.46, active: 0.4, subtle: 0.94 },
        status: { base: 0.48, subtle: 0.94, border: 0.54 },
    },
    dark: {
        elevation: ELEVATION_L,
        inverseBackground: 0.95,
        foreground: {
            primary: 0.95,
            secondary: 0.8,
            muted: 0.64,
            disabled: 0.45,
            onInverse: 0.18,
        },
        border: { subtle: 0.24, default: 0.54, strong: 0.62 },
        accent: { base: 0.78, hover: 0.85, active: 0.72, subtle: 0.24 },
        status: { base: 0.78, subtle: 0.26, border: 0.58 },
    },
};
