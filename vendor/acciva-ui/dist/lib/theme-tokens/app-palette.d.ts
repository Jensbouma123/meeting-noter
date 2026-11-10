import { type DtcgDocument, type HarmonyMode, type Hex, type Ramp, type SemanticRoles, type StepLabel, type ThemeMode } from "../color/index.js";
import { type AppPaletteName, type ShadeScale, type StatusPaletteName, type TailwindStep } from "./constants.js";
export type AppPalette = {
    readonly seed: Hex;
    readonly harmony: HarmonyMode;
    readonly document: DtcgDocument;
    readonly ramps: Readonly<Record<AppPaletteName | StatusPaletteName, Ramp>>;
    readonly scales: Readonly<Record<AppPaletteName | StatusPaletteName, ShadeScale>>;
    readonly aliases: Readonly<Record<TailwindStep, StepLabel>>;
    readonly roles: Readonly<Record<ThemeMode, SemanticRoles>>;
};
/**
 * The expensive half of a theme: seven gamut-mapped ramps and both modes' role
 * tables. Independent of the active mode, so a light/dark toggle never rebuilds
 * it (`.agents/performance.md`).
 */
export declare function buildAppPalette(seed: Hex, harmony?: HarmonyMode): AppPalette;
