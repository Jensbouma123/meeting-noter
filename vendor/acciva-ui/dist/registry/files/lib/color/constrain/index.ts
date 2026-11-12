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

export type {
  DualModeContext,
  DualModeMeasurement,
  DualModeReason,
  DualModeRequest,
  DualModeSolution,
  DualModeUse,
  MultiContextDualModeRequest,
} from "@/lib/color/constrain/types";
export { nearestRampStep } from "@/lib/color/constrain/steps";
export { solveMultiContextDualMode } from "@/lib/color/constrain/multi";
export { solveDualMode } from "@/lib/color/constrain/single";
