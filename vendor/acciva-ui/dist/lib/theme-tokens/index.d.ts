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
export { APP_PALETTES, BADGE_PALETTES, DEFAULT_HARMONY, DEFAULT_SEED, HARMONY_MODES, STATUS_PALETTES, TAILWIND_STEPS, type AppPaletteName, type BadgePalette, type ShadeScale, type StatusPaletteName, type TailwindStep, type ThemeVariable, } from "./constants.js";
export { DEFAULT_RADIUS, RADIUS_BASE_VARIABLE, RADIUS_MAP, RADIUS_STEP_RATIOS, radiusVariables, type RadiusScale, type RadiusVariable, } from "./radius.js";
export { PRESET_PALETTES } from "./presets.js";
export type { PresetPalette, PresetTokenOverrides } from "./preset-types.js";
export { buildAppPalette, type AppPalette } from "./app-palette.js";
export { paletteVariables, semanticVariables } from "./semantic-variables.js";
export { ROLE_VARIABLES, SOLVABLE_ROLES, getCssVariableForPair, type SolvableRole, } from "./roles.js";
export { resolveAppTheme, type AppTheme } from "./app-theme.js";
export { applyThemeOverrides } from "./apply-overrides.js";
export { buildAppTheme, buildPresetTheme } from "./build-theme.js";
export { ROLE_THRESHOLDS, type AdjustableTarget, type ContrastRoleCategory, type ContrastVerdict, type RoleThresholdConfig, } from "./contrast-thresholds.js";
export { themeContrastPairs, type ThemeContrastPair } from "./contrast-pairs.js";
export { gradePalette, type SeedGrade, type SeedGradeLevel } from "./seed-grade.js";
export { suggestSeed, type SeedSuggestion } from "./seed-suggest.js";
export { autoFixSeedForContrast, type AutoFixSeedResult } from "./seed-fix.js";
export { solvePairForRole } from "./pair-solver.js";
export type { SolvedPairRoleResult } from "./pair-solver-helpers.js";
export { autoFixTheme, solveAllContrastPairs, type AutoFixThemeResult, type ContrastPairSolution, } from "./solve-all.js";
export { buildThemeStylesheet, type ThemeStylesheetMeta } from "./stylesheet.js";
