import type { OKLCH, PaletteName, Ramp, StepLabel, SurfaceScale } from "../types.js";
import type { SemanticRole, SurfacePalette } from "./types.js";
export type RampEntry = {
    step: StepLabel;
    color: OKLCH;
};
export declare function rampEntries(scale: Ramp | SurfaceScale): RampEntry[];
export declare function nearestByLightness(scale: Ramp | SurfaceScale, targetL: number): RampEntry;
export declare function entryToRole(palette: PaletteName | SurfacePalette, entry: RampEntry, description: string): SemanticRole;
