import { DEFAULT_HARMONY } from "./constants.js";
import { buildAppPalette } from "./app-palette.js";
import { applyThemeOverrides } from "./apply-overrides.js";
import { resolveAppTheme } from "./app-theme.js";
export function buildAppTheme(seed, mode, harmony = DEFAULT_HARMONY) {
    return resolveAppTheme(buildAppPalette(seed, harmony), mode);
}
/**
 * A preset's theme for one mode. A preset carrying no overrides resolves to
 * exactly `buildAppTheme(seed, mode, harmony)`, so this is the single entry
 * point whether or not a preset needed to pin any family.
 */
export function buildPresetTheme(preset, mode) {
    return applyThemeOverrides(buildAppTheme(preset.seed, mode, preset.harmony), preset.tokenOverrides?.[mode] ?? {});
}
