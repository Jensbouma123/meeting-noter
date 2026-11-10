import type { PresetTokenOverrides } from "./preset-types.js";
/**
 * Every role Turf chooses for itself. `--focus-ring-offset` is the one role
 * graded from both sides at once — against each action fill and against the
 * outer ring — so a pinned value can only be right for the fills it was measured
 * against. Light mode's `#f4f9f5` was measured against fills that still hold, so
 * it stands; dark mode has no value that satisfies both sides and omits the key,
 * which hands the role to the solver (`#0d110d`).
 */
export declare const TURF_SEMANTIC_OVERRIDES: PresetTokenOverrides;
