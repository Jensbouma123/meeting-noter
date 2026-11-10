/**
 * Radius and elevation by surface *role*, not by taste.
 *
 * A surface's role is where it sits in the stack, and that alone fixes its
 * corner radius and its shadow. Two surfaces with the same role always look the
 * same; a surface never picks a `rounded-*` or `shadow-*` class of its own.
 * See the "Radius and elevation by role" section of `.agents/styling.md`.
 */
export type SurfaceRole = "surface" | "raised" | "inset" | "overlay" | "control" | "pill";
/**
 * Radius steps down as surfaces nest: an overlay floats above the page, a
 * surface sits on it, an inset panel sits inside a surface. Each step is one
 * stop on the `--radius-base` ramp, so the whole system scales with the radius
 * picker (see [[styling]]).
 */
export declare const SURFACE_RADIUS: Record<SurfaceRole, string>;
/**
 * The tone of a coloured focus/selection glow. `brand` marks the default
 * attention state, `danger`/`warning` mark their status states.
 */
export type GlowTone = "brand" | "danger" | "warning";
/**
 * At most one shadow per stacking context: a surface casts, everything nested
 * inside it is flat. Each step pairs with its `bg-elevation-N` fill, so the
 * colour ladder and the lift never drift apart. `raised` deliberately rests
 * one step below `SURFACE_HOVER_SHADOW` so it has a step left to travel — a
 * card that already rests at its hover elevation gives no feedback at all.
 * The scale is seed-independent (`@theme` keys in `src/styles/base.css`), so
 * the same classes hold in both modes with no `dark:` branch.
 */
export declare const SURFACE_SHADOW: Record<SurfaceRole, string>;
/**
 * The hover/focus elevation for an interactive surface — exactly one step above
 * its resting shadow, never two. Roles that are never the click target of a
 * whole surface have none.
 */
export declare const SURFACE_HOVER_SHADOW: Record<SurfaceRole, string>;
/**
 * Coloured focus/selection glows by tone. Each references a solved colour
 * role, so the glow follows the theme. A glow is never the only focus
 * indicator — pair it with `.focus-ring` or a border-colour change
 * (WCAG 2.2 SC 2.4.11 / 2.4.13).
 */
export declare const GLOW_SHADOW: Record<GlowTone, string>;
/**
 * Background and border for each role, in semantic roles only. `inset` drops to
 * `bg-background` so a nested panel reads as a well cut into its parent rather
 * than a second card stacked on it. `overlay` fills at `bg-elevation-3` (the
 * colour its `shadow-elevation-3` pairs with), so a menu or popover opened over
 * a `bg-surface` sheet stays distinct from it in both themes.
 */
export declare const SURFACE_FILL: Record<SurfaceRole, string>;
