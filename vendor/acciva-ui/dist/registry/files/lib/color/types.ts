export type RGB = { r: number; g: number; b: number };      // 0-255
export type LinearRGB = { r: number; g: number; b: number }; // 0-1
export type XYZ = { x: number; y: number; z: number };
export type OKLab = { l: number; a: number; b: number };
export type OKLCH = { l: number; c: number; h: number };     // l 0-1, c 0-0.4, h 0-360
export type Gamut = "srgb" | "display-p3";
export type Hex = string;                                    // "#rrggbb"
export type ThemeMode = "light" | "dark";
export type StepLabel = number;                              // ramp step key
export type Ramp = Record<StepLabel, OKLCH>;
export type HarmonyMode =
  | "complementary" | "analogous" | "triadic"
  | "split-complementary" | "tetradic" | "monochromatic";

/** Named primitive ramps a generated palette carries. Every one is a 26-step
 * `Ramp` keyed by `RAMP_STEPS`. The elevation `surface` scale is deliberately
 * NOT a member: its keys are the elevation ladders, not ramp steps, so it is
 * typed `SurfaceScale` instead and cannot be iterated with `RAMP_STEPS`.
 */
export type PaletteName =
  | "brand"
  | "accent"
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

/** One built ramp per palette. */
export type SemanticRampSet = Record<PaletteName, Ramp>;

/**
 * The low-chroma (C 0.01) neutral scale the elevation surfaces are cut from; it
 * rides the seed hue so dark-mode surfaces stay tinted toward the brand instead
 * of going flat grey. Keyed by `SURFACE_STEPS` (the light ladder 980/960/950/930
 * and the dark ladder 140/170/200/240/280), which are NOT `RAMP_STEPS`.
 */
export type SurfaceScale = Record<StepLabel, OKLCH>;
