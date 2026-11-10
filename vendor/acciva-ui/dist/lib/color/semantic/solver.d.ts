import { type DualModeUse } from "../constrain/index.js";
import type { Hex, Ramp, SurfaceScale } from "../types.js";
import { type RampEntry } from "./ramp-entries.js";
/**
 * One WCAG 2.2 AA floor and every colour the role is rendered against at that
 * floor. A role can carry several: the secondary accent is body text on its own
 * tinted background (4.5:1) and a large heading on the page canvas (3:1), and
 * holding the looser context to the stricter floor would move a role that
 * already conforms.
 */
export type RoleConstraint = {
    readonly use: DualModeUse;
    readonly contexts: readonly Hex[];
};
/**
 * The step nearest the designer's intent that clears `required` and, when any
 * step clears both tiers, `preferred` as well. Ties — the intent sitting
 * equidistant between two qualifying steps — go to the larger minimum ratio, so
 * the free choice buys headroom rather than ramp direction.
 *
 * When nothing clears `required` the intent step is returned unchanged. The
 * role stays populated and `auditTheme` reports the shortfall; silently
 * widening the floor or dropping the role would hide a real failure.
 */
export declare function solvedEntry(scale: Ramp | SurfaceScale, targetL: number, required: readonly RoleConstraint[], preferred?: readonly RoleConstraint[]): RampEntry;
