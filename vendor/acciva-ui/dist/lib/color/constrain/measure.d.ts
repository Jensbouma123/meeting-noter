import type { Hex, ThemeMode } from "../types.js";
import type { Candidate, DualModeMeasurement, DualModeReason } from "./types.js";
/**
 * `solved` is the step this mode will actually use — the shared step, or this
 * mode's own fallback. When nothing passes, the step is `null` and the numbers
 * come from `atIntent`, so the caller can still show how far short the
 * designer's own choice falls.
 */
export declare function measurement(mode: ThemeMode, solved: Candidate | null, atIntent: Candidate): DualModeMeasurement;
export declare function unsolvedReason(lightSolvable: boolean, darkSolvable: boolean): DualModeReason;
export declare function emptyMeasurement(mode: ThemeMode, background: Hex): DualModeMeasurement;
