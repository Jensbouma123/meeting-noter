import type { RolePath } from "../audit/index.js";
import type { Hex, Ramp, StepLabel, ThemeMode } from "../types.js";
import type { AppPalette } from "../../theme-tokens/index.js";
/**
 * The elevation surfaces are cut from a `SurfaceScale` whose keys are the
 * elevation ladders, not ramp steps, so `AppPalette.ramps` does not carry it.
 * It is recovered from the roles that alias it — both modes, because the light
 * ladder (980/960/950/930) and the dark one (140…280) are disjoint halves of
 * the same scale. `solveDualMode` reads steps off the scale it is handed, so an
 * elevation role solves exactly the way a ramp role does.
 */
export declare function surfaceScaleOf(palette: AppPalette): Ramp;
/** The scale a role's value is drawn from — the vocabulary its solve may use. */
export declare function rampForRole(palette: AppPalette, path: RolePath): Ramp;
export declare function roleHex(palette: AppPalette, mode: ThemeMode, path: RolePath): Hex;
/** The role's own light-mode step: the designer's starting intent before any edit. */
export declare function defaultIntentFor(palette: AppPalette, path: RolePath): StepLabel;
