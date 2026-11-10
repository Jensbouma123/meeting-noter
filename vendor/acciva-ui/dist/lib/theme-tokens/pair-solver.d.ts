import { type ThemeMode } from "../color/index.js";
import type { ThemeContrastPair } from "./contrast-pairs.js";
import { type SolvedPairRoleResult } from "./pair-solver-helpers.js";
/**
 * Role-specific contrast solver. Adjusts the token (foreground text/border/focus
 * or background fill) by minimal OKLCH lightness shift, preserving hue and
 * chroma, until it clears the role's real threshold.
 *
 * The whole lightness axis is searched, both lighter and darker than where the
 * role starts, and the nearest passing lightness wins — the auto-constrain
 * guarantee is that a reachable pass is found, so a one-sided search that can
 * miss it is a bug, not a preference.
 *
 * The gate is the WCAG 2.2 ratio. Among the lightnesses that clear it the solver
 * prefers one that also meets the advisory APCA target, but when no such
 * lightness exists in gamut it returns the nearest ratio-clearing colour and
 * reports `apca.passes: false` — the ratio decides, and the report says so.
 * There is no lightness window that reports a pass a colour did not earn.
 */
export declare function solvePairForRole(pair: ThemeContrastPair, targetLevel?: "AA" | "AAA", mode?: ThemeMode): SolvedPairRoleResult;
