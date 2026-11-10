import { type ContrastUse, type Hex } from "../color/index.js";
import type { AppTheme } from "./app-theme.js";
import type { AdjustableTarget, ContrastRoleCategory } from "./contrast-thresholds.js";
import type { SolvableRole } from "./roles.js";
export type PairSpec = {
    readonly id: SolvableRole;
    readonly label: string;
    readonly use: ContrastUse;
    readonly category: ContrastRoleCategory;
    readonly adjustableTarget: AdjustableTarget;
    readonly pick: (theme: AppTheme) => readonly [Hex, Hex];
};
/**
 * Every pair reads its foreground (or, for an action fill, its background) out
 * of `roleColors`, so the colour graded here is the colour the role's own
 * property carries — a solved override shows up in the next grade instead of
 * being masked by the primitive step it was derived from.
 *
 * Order matters for `solveAllContrastPairs`, which folds each fix in before
 * reading the next pair: the action fills come before the offset ring that is
 * measured against them, and the offset ring before the outer focus ring that
 * is measured against it.
 */
export declare const PAIR_SPECS: readonly PairSpec[];
