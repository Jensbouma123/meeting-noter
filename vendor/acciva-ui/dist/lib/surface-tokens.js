/**
 * Radius steps down as surfaces nest: an overlay floats above the page, a
 * surface sits on it, an inset panel sits inside a surface. Each step is one
 * stop on the `--radius-base` ramp, so the whole system scales with the radius
 * picker (see [[styling]]).
 */
export const SURFACE_RADIUS = {
    surface: "rounded-xl",
    raised: "rounded-xl",
    inset: "rounded-lg",
    overlay: "rounded-2xl",
    control: "rounded-lg",
    pill: "rounded-full",
};
/**
 * At most one shadow per stacking context: a surface casts, everything nested
 * inside it is flat. Each step pairs with its `bg-elevation-N` fill, so the
 * colour ladder and the lift never drift apart. `raised` deliberately rests
 * one step below `SURFACE_HOVER_SHADOW` so it has a step left to travel — a
 * card that already rests at its hover elevation gives no feedback at all.
 * The scale is seed-independent (`@theme` keys in `src/styles/base.css`), so
 * the same classes hold in both modes with no `dark:` branch.
 */
export const SURFACE_SHADOW = {
    surface: "shadow-elevation-1",
    raised: "shadow-elevation-2",
    inset: "",
    overlay: "shadow-elevation-3",
    control: "",
    pill: "",
};
/**
 * The hover/focus elevation for an interactive surface — exactly one step above
 * its resting shadow, never two. Roles that are never the click target of a
 * whole surface have none.
 */
export const SURFACE_HOVER_SHADOW = {
    surface: "hover:shadow-elevation-2",
    raised: "hover:shadow-elevation-3",
    inset: "hover:shadow-elevation-1",
    overlay: "",
    control: "",
    pill: "",
};
/**
 * Coloured focus/selection glows by tone. Each references a solved colour
 * role, so the glow follows the theme. A glow is never the only focus
 * indicator — pair it with `.focus-ring` or a border-colour change
 * (WCAG 2.2 SC 2.4.11 / 2.4.13).
 */
export const GLOW_SHADOW = {
    brand: "shadow-glow-brand",
    danger: "shadow-glow-danger",
    warning: "shadow-glow-warning",
};
/**
 * Background and border for each role, in semantic roles only. `inset` drops to
 * `bg-background` so a nested panel reads as a well cut into its parent rather
 * than a second card stacked on it. `overlay` fills at `bg-elevation-3` (the
 * colour its `shadow-elevation-3` pairs with), so a menu or popover opened over
 * a `bg-surface` sheet stays distinct from it in both themes.
 */
export const SURFACE_FILL = {
    surface: "border border-border bg-surface",
    raised: "border border-border bg-surface",
    inset: "border border-border bg-background",
    overlay: "border border-border bg-elevation-3",
    control: "border border-border bg-surface",
    pill: "border border-border bg-surface",
};
