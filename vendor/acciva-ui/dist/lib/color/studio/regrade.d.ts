import { type ThemeAudit } from "../audit/index.js";
import type { RoleModeHexes } from "./types.js";
/**
 * The audit the gate reads: the seed's verdict with the designer's overrides
 * applied.
 *
 * This is the whole point. `auditTokenGraph` grades the graph the seed built,
 * which knows nothing about a role the designer moved — so a resolved role's
 * fix used to be invisible to `passesAA` in both directions: a fix could not
 * open the gate, and a regression could not close it. The gate has to grade the
 * colours that will be emitted, and the emitted colours are graph plus
 * overrides.
 *
 * It re-grades **only the rows an override touches**, and returns `base`
 * unchanged when there are none, so the 124-verdict pass stays keyed on the
 * seed. Every untouched `PairResult` is passed through by reference.
 */
export declare function applyRoleOverrides(base: ThemeAudit, overrides: RoleModeHexes): ThemeAudit;
