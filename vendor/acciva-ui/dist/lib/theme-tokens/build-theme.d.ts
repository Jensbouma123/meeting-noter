import type { HarmonyMode, Hex, ThemeMode } from "../color/index.js";
import { type AppTheme } from "./app-theme.js";
import type { PresetPalette } from "./preset-types.js";
export declare function buildAppTheme(seed: Hex, mode: ThemeMode, harmony?: HarmonyMode): AppTheme;
/**
 * A preset's theme for one mode. A preset carrying no overrides resolves to
 * exactly `buildAppTheme(seed, mode, harmony)`, so this is the single entry
 * point whether or not a preset needed to pin any family.
 */
export declare function buildPresetTheme(preset: PresetPalette, mode: ThemeMode): AppTheme;
