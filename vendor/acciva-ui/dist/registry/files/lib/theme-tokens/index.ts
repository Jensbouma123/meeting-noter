/**
 * The app's view of the OKLCH engine.
 *
 * `@/lib/color` models a theme as brand / accent / neutral / status ramps of 26
 * steps plus semantic roles per mode. This app's components were written
 * against Tailwind-shaped `primary` / `secondary` / `accent` / `neutral` scales
 * and a flat `--background` / `--surface` / `--foreground` property set, so this
 * module is the single place that speaks both vocabularies. It is pure — no
 * React, no DOM — and is the only thing `theme-context.tsx` and the tokens.css
 * generator need to import.
 */

export {
  APP_PALETTES,
  BADGE_PALETTES,
  DEFAULT_HARMONY,
  DEFAULT_SEED,
  HARMONY_MODES,
  STATUS_PALETTES,
  TAILWIND_STEPS,
  type AppPaletteName,
  type BadgePalette,
  type ShadeScale,
  type StatusPaletteName,
  type TailwindStep,
  type ThemeVariable,
} from "@/lib/theme-tokens/constants";
export {
  DEFAULT_RADIUS,
  RADIUS_BASE_VARIABLE,
  RADIUS_MAP,
  RADIUS_STEP_RATIOS,
  radiusVariables,
  type RadiusScale,
  type RadiusVariable,
} from "@/lib/theme-tokens/radius";
export { PRESET_PALETTES } from "@/lib/theme-tokens/presets";
export type { PresetPalette, PresetTokenOverrides } from "@/lib/theme-tokens/preset-types";
export { buildAppPalette, type AppPalette } from "@/lib/theme-tokens/app-palette";
export { paletteVariables, semanticVariables } from "@/lib/theme-tokens/semantic-variables";
export {
  ROLE_VARIABLES,
  SOLVABLE_ROLES,
  getCssVariableForPair,
  type SolvableRole,
} from "@/lib/theme-tokens/roles";
export { resolveAppTheme, type AppTheme } from "@/lib/theme-tokens/app-theme";
export { applyThemeOverrides } from "@/lib/theme-tokens/apply-overrides";
export { buildAppTheme, buildPresetTheme } from "@/lib/theme-tokens/build-theme";
export {
  ROLE_THRESHOLDS,
  type AdjustableTarget,
  type ContrastRoleCategory,
  type ContrastVerdict,
  type RoleThresholdConfig,
} from "@/lib/theme-tokens/contrast-thresholds";
export { themeContrastPairs, type ThemeContrastPair } from "@/lib/theme-tokens/contrast-pairs";
export { gradePalette, type SeedGrade, type SeedGradeLevel } from "@/lib/theme-tokens/seed-grade";
export { suggestSeed, type SeedSuggestion } from "@/lib/theme-tokens/seed-suggest";
export { autoFixSeedForContrast, type AutoFixSeedResult } from "@/lib/theme-tokens/seed-fix";
export { solvePairForRole } from "@/lib/theme-tokens/pair-solver";
export type { SolvedPairRoleResult } from "@/lib/theme-tokens/pair-solver-helpers";
export {
  autoFixTheme,
  solveAllContrastPairs,
  type AutoFixThemeResult,
  type ContrastPairSolution,
} from "@/lib/theme-tokens/solve-all";
export { buildThemeStylesheet, type ThemeStylesheetMeta } from "@/lib/theme-tokens/stylesheet";
