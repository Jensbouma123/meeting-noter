import { type RolePath, type ThemeAudit } from "./audit.js";
import { type DualModeReason } from "./constrain.js";
import type { ModeTokenOverrides } from "./export/resolve.js";
import type { HarmonyMode, Hex } from "./types.js";
export type UnresolvableRole = {
    readonly role: RolePath;
    readonly reason: DualModeReason;
    readonly required: number;
};
export type GeneratedTheme = {
    readonly seed: Hex;
    readonly harmony: HarmonyMode;
    /**
     * The complete drop-in stylesheet: the three colour blocks, the app-facing
     * alias layer and the `@theme inline` bridge — the same string
     * `scripts/generate-tokens.ts` writes to `src/styles/tokens.css`. Only the
     * 11 public ramp stops are emitted; `--format dtcg` carries the full graph.
     * Studio per-mode overrides are not applied here (see `overrides`): they are
     * keyed by the graph's variable names and would move the shipped values.
     */
    readonly css: string;
    readonly tailwind: string;
    readonly dtcg: string;
    readonly audit: ThemeAudit;
    readonly passesAA: boolean;
    readonly overrides: ModeTokenOverrides;
    readonly unresolvable: readonly UnresolvableRole[];
};
/**
 * A headless WCAG 2.2 AA theme from a brand seed, with no human in the loop.
 *
 * Every non-converged role is split per mode automatically, through the same
 * dependency-ordered path `useColorStudio` uses. A seed that cannot resolve
 * does not throw and does not nudge the hue: the roles that cannot be carried
 * are returned in `unresolvable`, `passesAA` is `false`, and the emitters still
 * run so the caller can inspect the near miss.
 *
 * Pure and synchronous: no React, no I/O, no `process`, no filesystem.
 * Deterministic: the same seed and harmony give byte-identical output.
 */
export declare function generateTheme(seed: Hex, options?: {
    harmony?: HarmonyMode;
}): GeneratedTheme;
