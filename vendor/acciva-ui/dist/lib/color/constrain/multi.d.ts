import type { DualModeSolution, MultiContextDualModeRequest } from "./types.js";
/**
 * Solve one role across all of its contexts for both modes at once.
 *
 * Walks the role's ramp for the step nearest `intent` whose colour clears WCAG 2.2
 * AA against every context in light mode and every context in dark mode.
 */
export declare function solveMultiContextDualMode(request: MultiContextDualModeRequest): DualModeSolution;
