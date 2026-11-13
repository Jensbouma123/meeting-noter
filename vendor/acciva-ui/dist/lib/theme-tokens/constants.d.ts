import type { ContrastUse, HarmonyMode, Hex, ThemeMode } from "../color/index.js";
export type AppPaletteName = "primary" | "secondary" | "accent" | "neutral";
export declare const APP_PALETTES: readonly AppPaletteName[];
/** Tailwind's stop names, lightest first. The app's public palette surface. */
export declare const TAILWIND_STEPS: readonly [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
export type TailwindStep = (typeof TAILWIND_STEPS)[number];
export type ShadeScale = Readonly<Record<TailwindStep, Hex>>;
/** A generated custom property: the hex fallback and the `oklch()` it precedes. */
export type ThemeVariable = {
    readonly name: string;
    readonly hex: Hex;
    readonly literal: string;
};
export declare const HARMONY_MODES: readonly ["complementary", "analogous", "triadic", "split-complementary", "tetradic", "monochromatic"];
export declare const DEFAULT_SEED: Hex;
export declare const DEFAULT_HARMONY: HarmonyMode;
/**
 * `500` is the action fill: `Button` variant `primary` paints white text on it,
 * so a lightness alias alone is not enough — the step has to clear WCAG 2.1 AA
 * *and* the APCA body target against white. The action stop is therefore solved
 * rather than looked up, and 600-950 are pushed down the ramp behind it so hover
 * and pressed states stay darker than rest.
 */
export declare const ACTION_STEP: TailwindStep;
export declare const ACTION_LABEL: Hex;
export declare const ACTION_USE: ContrastUse;
/** The solver never darkens the action fill past what Tailwind would call 800. */
export declare const ACTION_FLOOR_STEP: TailwindStep;
export declare const STATUS_PALETTES: readonly ["success", "warning", "danger", "info"];
export type StatusPaletteName = (typeof STATUS_PALETTES)[number];
/** The tinted label surfaces: a fill step plus a label step, one per status hue. */
export declare const BADGE_PALETTES: readonly ["primary", "success", "warning", "danger", "info"];
export type BadgePalette = (typeof BADGE_PALETTES)[number];
/** The three fills `Button` paints a white label on. */
export declare const ACTION_PALETTES: readonly ["primary", "secondary", "accent"];
export declare const BADGE_LABEL_STEP: Readonly<Record<ThemeMode, TailwindStep>>;
export declare const BADGE_FILL_STEP: Readonly<Record<ThemeMode, TailwindStep>>;
export declare const LINK_STEP: Readonly<Record<ThemeMode, 500 | 400 | 300 | 100 | 700 | 50 | 200 | 600 | 800 | 900 | 950>>;
