import type { Hex } from "../color/index.js";
import type { AppPalette } from "./app-palette.js";
import { type ThemeContrastPair } from "./contrast-pairs.js";
export type SeedGradeLevel = "AAA" | "AA" | "Partial" | "Fail";
export type SeedGrade = {
    readonly seed: Hex;
    readonly score: number;
    readonly level: SeedGradeLevel;
    readonly pairs: readonly ThemeContrastPair[];
    readonly failing: readonly ThemeContrastPair[];
};
/**
 * Grades a palette by what its *generated* theme achieves in both modes, not by
 * the seed colour in isolation: the engine solves the action stop and the
 * on-colours, so a raw hex says very little about the palette it produces.
 */
export declare function gradePalette(palette: AppPalette, tokenOverrides?: {
    light?: Record<string, string>;
    dark?: Record<string, string>;
}): SeedGrade;
