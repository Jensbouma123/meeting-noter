import type { ContrastUse, HarmonyMode, Hex, ThemeMode } from "@/lib/color/index";

export type AppPaletteName = "primary" | "secondary" | "accent" | "neutral";

export const APP_PALETTES: readonly AppPaletteName[] = ["primary", "secondary", "accent", "neutral"];

/** Tailwind's stop names, lightest first. The app's public palette surface. */
export const TAILWIND_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

export type TailwindStep = (typeof TAILWIND_STEPS)[number];

export type ShadeScale = Readonly<Record<TailwindStep, Hex>>;

/** A generated custom property: the hex fallback and the `oklch()` it precedes. */
export type ThemeVariable = {
  readonly name: string;
  readonly hex: Hex;
  readonly literal: string;
};

export const HARMONY_MODES = [
  "complementary",
  "analogous",
  "triadic",
  "split-complementary",
  "tetradic",
  "monochromatic",
] as const;

export const DEFAULT_SEED: Hex = "#00835b";
export const DEFAULT_HARMONY: HarmonyMode = "complementary";

/**
 * `500` is the action fill: `Button` variant `primary` paints white text on it,
 * so a lightness alias alone is not enough — the step has to clear WCAG 2.1 AA
 * *and* the APCA body target against white. The action stop is therefore solved
 * rather than looked up, and 600-950 are pushed down the ramp behind it so hover
 * and pressed states stay darker than rest.
 */
export const ACTION_STEP: TailwindStep = 500;
export const ACTION_LABEL: Hex = "#ffffff";
export const ACTION_USE: ContrastUse = "body";
/** The solver never darkens the action fill past what Tailwind would call 800. */
export const ACTION_FLOOR_STEP: TailwindStep = 800;

export const STATUS_PALETTES = ["success", "warning", "danger", "info"] as const;
export type StatusPaletteName = (typeof STATUS_PALETTES)[number];

/** The tinted label surfaces: a fill step plus a label step, one per status hue. */
export const BADGE_PALETTES = ["primary", "success", "warning", "danger", "info"] as const;
export type BadgePalette = (typeof BADGE_PALETTES)[number];

/** The three fills `Button` paints a white label on. */
export const ACTION_PALETTES = ["primary", "secondary", "accent"] as const;

export const BADGE_LABEL_STEP: Readonly<Record<ThemeMode, TailwindStep>> = { light: 800, dark: 300 };
export const BADGE_FILL_STEP: Readonly<Record<ThemeMode, TailwindStep>> = { light: 100, dark: 950 };
export const LINK_STEP = BADGE_LABEL_STEP;
