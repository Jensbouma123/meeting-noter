import type { HarmonyMode, Hex, ThemeMode } from "../color/index.js";
import type { RadiusScale } from "./radius.js";
/** Per-mode `--property: #hex` replacements, the shape `applyThemeOverrides` reads. */
export type PresetTokenOverrides = Readonly<Record<ThemeMode, Readonly<Record<string, string>>>>;
/**
 * A named starting point. `seed` and `harmony` are the whole preset whenever the
 * engine's rotations are the intent; `tokenOverrides` exists for the case they
 * are not — a preset whose secondary or status families own a chosen hue rather
 * than a derived one carries those ramps as overrides, because the engine has
 * exactly one seed to rotate from. Both are optional, so every preset written
 * against the older `{ name, seed, harmony }` shape still type-checks.
 */
export type PresetPalette = {
    readonly name: string;
    readonly seed: Hex;
    readonly harmony: HarmonyMode;
    readonly radius?: RadiusScale;
    readonly tokenOverrides?: PresetTokenOverrides;
};
