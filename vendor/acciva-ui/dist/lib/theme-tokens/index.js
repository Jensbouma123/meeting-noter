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
export { APP_PALETTES, BADGE_PALETTES, DEFAULT_HARMONY, DEFAULT_SEED, HARMONY_MODES, STATUS_PALETTES, TAILWIND_STEPS, } from "./constants.js";
export { DEFAULT_RADIUS, RADIUS_BASE_VARIABLE, RADIUS_MAP, RADIUS_STEP_RATIOS, radiusVariables, } from "./radius.js";
export { PRESET_PALETTES } from "./presets.js";
export { buildAppPalette } from "./app-palette.js";
export { paletteVariables, semanticVariables } from "./semantic-variables.js";
export { ROLE_VARIABLES, SOLVABLE_ROLES, getCssVariableForPair, } from "./roles.js";
export { resolveAppTheme } from "./app-theme.js";
export { applyThemeOverrides } from "./apply-overrides.js";
export { buildAppTheme, buildPresetTheme } from "./build-theme.js";
export { ROLE_THRESHOLDS, } from "./contrast-thresholds.js";
export { themeContrastPairs } from "./contrast-pairs.js";
export { gradePalette } from "./seed-grade.js";
export { suggestSeed } from "./seed-suggest.js";
export { autoFixSeedForContrast } from "./seed-fix.js";
export { solvePairForRole } from "./pair-solver.js";
export { autoFixTheme, solveAllContrastPairs, } from "./solve-all.js";
export { buildThemeStylesheet } from "./stylesheet.js";
