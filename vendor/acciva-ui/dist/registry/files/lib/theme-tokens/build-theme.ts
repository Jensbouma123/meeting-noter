import type { HarmonyMode, Hex, ThemeMode } from "@/lib/color/index";
import { DEFAULT_HARMONY } from "@/lib/theme-tokens/constants";
import { buildAppPalette } from "@/lib/theme-tokens/app-palette";
import { applyThemeOverrides } from "@/lib/theme-tokens/apply-overrides";
import { resolveAppTheme, type AppTheme } from "@/lib/theme-tokens/app-theme";
import type { PresetPalette } from "@/lib/theme-tokens/preset-types";

export function buildAppTheme(
  seed: Hex,
  mode: ThemeMode,
  harmony: HarmonyMode = DEFAULT_HARMONY,
): AppTheme {
  return resolveAppTheme(buildAppPalette(seed, harmony), mode);
}

/**
 * A preset's theme for one mode. A preset carrying no overrides resolves to
 * exactly `buildAppTheme(seed, mode, harmony)`, so this is the single entry
 * point whether or not a preset needed to pin any family.
 */
export function buildPresetTheme(preset: PresetPalette, mode: ThemeMode): AppTheme {
  return applyThemeOverrides(
    buildAppTheme(preset.seed, mode, preset.harmony),
    preset.tokenOverrides?.[mode] ?? {},
  );
}
