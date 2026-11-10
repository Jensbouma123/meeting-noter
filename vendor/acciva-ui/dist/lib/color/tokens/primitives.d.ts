import type { Gamut, HarmonyMode, OKLCH, Ramp, SemanticRampSet, SurfaceScale } from "../types.js";
import type { DtcgGroup } from "./types.js";
export declare function desaturate(ramp: Ramp, maxChroma: number): Ramp;
export declare function harmonyPartner(seed: OKLCH, mode: HarmonyMode): OKLCH;
export declare function scaleToGroup(scale: Ramp | SurfaceScale, name: string, precision: number): DtcgGroup;
export declare function buildRampSet(seed: OKLCH, gamut: Gamut, harmony: HarmonyMode): SemanticRampSet;
