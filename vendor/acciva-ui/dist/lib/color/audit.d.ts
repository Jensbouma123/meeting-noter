/**
 * Dual-mode WCAG 2.2 AA gate.
 *
 * A theme is only shippable when it clears AA in light **and** dark
 * simultaneously, so the audit grades one fixed table of role pairs against
 * both mode's resolved values and returns a single verdict.
 *
 * **The gate is the WCAG 2.2 contrast ratio and nothing else.** `pass` is
 * exactly `ratio >= required` (4.5 for body text, 3.0 for large text, UI
 * components, graphical objects and focus indicators). APCA `Lc` is reported
 * alongside every pair as advisory information — it is a WCAG 3 draft metric on
 * a perceptual scale, it is not a conformance requirement, and it must never
 * decide `pass`, `failures` or `passesAA`. This is why the audit does not use
 * `evaluatePair` from `contrast.ts` or `adjustForContrast` from `solve.ts`:
 * both AND the two engines together, which would fail a pair that conforms to
 * WCAG 2.2 AA.
 *
 * Values are read back through the emitted token graph rather than from
 * `buildSemanticRoles` directly, so the audit grades the colours that actually
 * ship — including the alias indirection and the `precision` rounding applied
 * on the way out.
 */
import { type ApcaTier, type ContrastUse, type WcagLevel } from "./contrast.js";
import type { AccentRole, BackgroundRole, BorderRole, ForegroundRole, StatusRole } from "./semantic.js";
import { type DtcgDocument, type TokenGraphOptions } from "./tokens.js";
import type { Hex, ThemeMode } from "./types.js";
/**
 * Addresses one semantic role as `group.role`. Mirrors the shape of
 * `SemanticRoles`, so a typo in the pair table is a type error rather than a
 * pair that silently never gets graded.
 */
export type RolePath = `background.${BackgroundRole}` | `foreground.${ForegroundRole}` | `border.${BorderRole}` | `accent.${AccentRole}` | `status.${StatusRole}`;
/**
 * The three WCAG 2.2 AA contrast floors that apply to a colour pair. Body text
 * is 4.5:1 (SC 1.4.3); large text, UI component boundaries, graphical objects
 * and focus indicators are all 3:1 (SC 1.4.3 large, SC 1.4.11, SC 2.4.13).
 * `decorative` and the APCA-only tiers are deliberately absent: a pair with no
 * AA floor does not belong in a gate.
 */
export type AaUse = Extract<ContrastUse, "body" | "large" | "ui">;
/**
 * A row's use. `decorative` carries no AA floor (`required` is 0) and cites no
 * success criterion: the row exists so a designer can read the measured ratio
 * of a pair WCAG 2.2 does not regulate. Decorative rows never gate.
 */
export type GateUse = AaUse | "decorative";
/** One row of the required-pair table. */
export type RequiredPair = {
    readonly id: string;
    readonly label: string;
    readonly foreground: RolePath;
    readonly background: RolePath;
    readonly use: GateUse;
    /** WCAG 2.2 success criteria this row exists to satisfy, for citation in PRs and specs. */
    readonly sc: readonly string[];
    /** Which side a solver may move; the other side is the fixed context. */
    readonly adjustable: "foreground" | "background";
    /**
     * `true` when WCAG 2.2 grants this pair an exemption and the floor is a house
     * minimum rather than a conformance requirement. Exempt rows are graded and
     * reported but never counted in `failures` or `passesAA`.
     */
    readonly exempt?: true;
};
/**
 * Every role pair a theme must clear to conform to WCAG 2.2 AA, in both modes.
 *
 * A given (foreground, background) role pair appears **once**, at the strictest
 * use that applies to it — a pair held to 4.5:1 as body text passes the 3:1
 * non-text floor by construction, so listing it twice would only inflate the
 * table.
 *
 * This table supersedes `PAIR_SPECS` / `ROLE_THRESHOLDS` in
 * `src/lib/theme-tokens.ts` and deliberately diverges from it in four places:
 *
 * - **Borders are 3:1, not 1.8:1.** `ROLE_THRESHOLDS.border.aa.ratio` is 1.8,
 *   which is not a WCAG number. SC 1.4.11 requires 3:1 for the boundary of a
 *   UI component. The border roles are split by function instead of relaxed:
 *   `border.default` and `border.strong` delimit controls and are gated at 3:1;
 *   `border.subtle` is a hairline separator — neither a control boundary nor a
 *   graphical object needed to understand content — so it is listed as
 *   `decorative`, cites no SC, and is measured but never gated.
 * - **No lightness pass-override.** `theme-tokens.ts` lets a dark border count
 *   as passing when its OKLCH lightness happens to fall in 0.28–0.40,
 *   regardless of the ratio. That fabricates conformance. Here `pass` is
 *   `ratio >= required`, always, with no escape hatch.
 * - **The focus indicator is graded along the whole painted chain**, not only
 *   against the canvas and card surface. SC 2.4.13 requires the indicator to
 *   contrast with adjacent colours, and the control fill it outlines is one of
 *   them. The theme ships a two-tone ring, so that chain is
 *   `fill | border.focusOffset | border.focus | surface` and the adjacencies a
 *   sighted keyboard user can see are fill↔offset, offset↔focus and
 *   focus↔surface. All seven are gated at 3:1, each between the two colours
 *   that actually touch. Grading `border.focus` straight against the fill would
 *   measure an inset ring the theme does not paint, and in dark mode no colour
 *   can satisfy it — see the focus-ring recipe in `.agents/lib/color-engine.md`.
 * - **Info status is covered.** `PAIR_SPECS` has badge pairs for success,
 *   warning and danger but not info; all four are enumerated here.
 *
 * `foreground.disabled` is exempt: SC 1.4.3 and SC 1.4.11 both exclude
 * inactive user interface components, so no AA floor is mandatory. The rows are
 * kept at the 3:1 large-text floor as a house minimum, marked `exempt`, so a
 * designer sees the number without it turning `passesAA` into a stricter
 * verdict than WCAG 2.2 AA actually is.
 */
export declare const REQUIRED_PAIRS: readonly RequiredPair[];
/** One graded pair, in one mode. */
export type PairResult = {
    readonly id: string;
    readonly label: string;
    readonly mode: ThemeMode;
    readonly use: GateUse;
    readonly foregroundRole: RolePath;
    readonly backgroundRole: RolePath;
    readonly foreground: Hex;
    readonly background: Hex;
    readonly ratio: number;
    readonly required: number;
    readonly level: WcagLevel;
    /** `ratio >= required`. The only conformance verdict. */
    readonly pass: boolean;
    readonly exempt: boolean;
    readonly sc: readonly string[];
    readonly adjustable: "foreground" | "background";
    /**
     * Advisory only. Reported so a designer can see the perceptual reading next
     * to the ratio; it does not participate in `pass`, `failures` or `passesAA`.
     */
    readonly apca: {
        readonly lc: number;
        readonly tier: ApcaTier;
    };
};
/**
 * Grade one pair from explicit hexes. Exposed so a caller that already has
 * resolved colours — an override editor, a test — can reuse the exact gate the
 * theme audit applies, without rebuilding a token graph.
 *
 * `pass` is `ratio >= required` with no other term. There is no lightness
 * window, no polarity special case and no APCA clause that can turn a failing
 * ratio into a pass.
 */
export declare function gradePair(pair: RequiredPair, mode: ThemeMode, foreground: Hex, background: Hex): PairResult;
export type ThemeAudit = {
    readonly seed: Hex;
    readonly light: readonly PairResult[];
    readonly dark: readonly PairResult[];
    /**
     * Every non-exempt failing pair from both modes, light first. Empty is the
     * only shippable state.
     */
    readonly failures: readonly PairResult[];
    /** `failures.length === 0` — WCAG 2.2 AA in light and dark simultaneously. */
    readonly passesAA: boolean;
};
export type AuditOptions = TokenGraphOptions;
/**
 * Grade an already-built token graph. Use this over {@link auditTheme} when the
 * caller holds a graph already — building one is ~14 ramps of work.
 */
export declare function auditTokenGraph(doc: DtcgDocument, seed?: Hex): ThemeAudit;
/**
 * Audit a seed colour's generated theme against WCAG 2.2 AA in both modes.
 * `passesAA` is true only when every non-exempt pair clears its ratio in light
 * *and* dark — a theme that conforms in one mode only does not pass.
 */
export declare function auditTheme(seed: Hex, opts?: AuditOptions): ThemeAudit;
