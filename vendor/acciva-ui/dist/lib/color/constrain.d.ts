/**
 * Dual-mode constraint solver.
 *
 * A role has one designer intent but two contexts: it renders on the light
 * background in light mode and on the dark background in dark mode. This walks
 * the role's own ramp for the step nearest that intent which clears WCAG 2.2 AA
 * against **both** backgrounds, and reports honestly when no single step can.
 *
 * **WCAG ratio only.** `adjustForContrast` in `solve.ts` is deliberately not
 * reused here: it ANDs the WCAG ratio with an APCA |Lc| target, so it rejects
 * steps that conform to WCAG 2.2 AA and would make the gate stricter than the
 * standard. APCA is reported per mode as advisory context and never decides
 * `converged`.
 *
 * Only ramp steps are considered, not arbitrary lightnesses. The ramp is the
 * theme's vocabulary: a solved colour that is not a step cannot be aliased by a
 * token, so it would leak a literal into the graph.
 */
import type { Hex, OKLCH, Ramp, StepLabel, ThemeMode } from "./types.js";
import type { AaUse } from "./audit.js";
/** What the role is used for, which fixes the AA floor it must clear. */
export type DualModeUse = AaUse;
export type DualModeContext = {
    readonly lightBackground: Hex;
    readonly darkBackground: Hex;
    readonly use?: DualModeUse;
};
export type MultiContextDualModeRequest = {
    readonly ramp: Ramp;
    readonly intent: StepLabel;
    readonly contexts: readonly DualModeContext[];
    readonly use: DualModeUse;
};
export type DualModeRequest = {
    readonly ramp: Ramp;
    /** The step the designer picked. The solver stays as close to it as the gate allows. */
    readonly intent: StepLabel;
    /** The background the role renders on in light mode. */
    readonly lightBackground: Hex;
    /** The background the role renders on in dark mode. */
    readonly darkBackground: Hex;
    readonly use: DualModeUse;
};
/** Why no single step satisfies both modes. */
export type DualModeReason = 
/** Each mode is solvable alone, but no one step clears both at once. */
"no-shared-step"
/** No step in the ramp clears AA against the light background. */
 | "light-unsolvable"
/** No step in the ramp clears AA against the dark background. */
 | "dark-unsolvable"
/** Neither background can be cleared by any step in the ramp. */
 | "both-unsolvable"
/** The ramp carries no steps. */
 | "empty-ramp";
/** How the reported colour measures against one mode's background. */
export type DualModeMeasurement = {
    readonly mode: ThemeMode;
    readonly background: Hex;
    /**
     * The nearest-to-intent step clearing AA in this mode alone, or `null` when
     * no step does. Equals {@link DualModeSolution.step} when the solve converged.
     */
    readonly step: StepLabel | null;
    readonly hex: Hex | null;
    /** Ratio at `step`, or at the intent step when `step` is `null`. */
    readonly ratio: number;
    readonly pass: boolean;
    /** Advisory only; never gates. */
    readonly apcaLc: number;
};
export type DualModeSolution = {
    /** `true` only when one step clears AA against both backgrounds. */
    readonly converged: boolean;
    /** The shared step, or `null` when none exists. */
    readonly step: StepLabel | null;
    readonly color: OKLCH | null;
    readonly hex: Hex | null;
    readonly use: DualModeUse;
    readonly required: number;
    readonly intent: StepLabel;
    /** Steps away from `intent` the solution sits, in ramp positions. `null` when unsolved. */
    readonly intentDistance: number | null;
    readonly light: DualModeMeasurement;
    readonly dark: DualModeMeasurement;
    /** Shorthand for `light.step` — the light-mode-only fallback. */
    readonly lightStep: StepLabel | null;
    /** Shorthand for `dark.step` — the dark-mode-only fallback. */
    readonly darkStep: StepLabel | null;
    /** `null` when converged. */
    readonly reason: DualModeReason | null;
    /** Every step clearing both backgrounds, ascending. Empty when unsolved. */
    readonly stepsClearingBoth: readonly StepLabel[];
};
/**
 * The canonical ramp step closest to a raw OKLCH lightness. Callers holding a
 * designer's lightness rather than a step label use this to name their intent.
 */
export declare function nearestRampStep(lightness: number): StepLabel;
/**
 * Solve one role across all of its contexts for both modes at once.
 *
 * Walks the role's ramp for the step nearest `intent` whose colour clears WCAG 2.2
 * AA against every context in light mode and every context in dark mode.
 */
export declare function solveMultiContextDualMode(request: MultiContextDualModeRequest): DualModeSolution;
/**
 * Solve one role for both modes at once against a single context pair.
 */
export declare function solveDualMode(request: DualModeRequest): DualModeSolution;
