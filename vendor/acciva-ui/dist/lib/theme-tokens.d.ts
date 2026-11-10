/**
 * The app's view of the OKLCH engine.
 *
 * `@/lib/color` models a theme as brand / accent / neutral / status ramps of 26
 * steps plus semantic roles per mode. This app's components were written
 * against Tailwind-shaped `primary` / `secondary` / `accent` / `neutral` scales
 * and a flat `--background` / `--surface` / `--foreground` property set, so this
 * module is the single place that speaks both vocabularies. It is pure — no
 * React, no DOM — and is the only thing `theme-context.tsx` and the tokens.css
 * generator need to import.
 */
import { type ContrastReport, type ContrastUse, type DtcgDocument, type HarmonyMode, type Hex, type Ramp, type SemanticRoles, type StepLabel, type ThemeMode } from "../lib/color/index.js";
export type AppPaletteName = "primary" | "secondary" | "accent" | "neutral";
export declare const APP_PALETTES: readonly AppPaletteName[];
/** Tailwind's stop names, lightest first. The app's public palette surface. */
export declare const TAILWIND_STEPS: readonly [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
export type TailwindStep = (typeof TAILWIND_STEPS)[number];
export type ShadeScale = Readonly<Record<TailwindStep, Hex>>;
/** A generated custom property: the hex fallback and the `oklch()` it precedes. */
export type ThemeVariable = {
    readonly name: string;
    readonly hex: Hex;
    readonly literal: string;
};
export declare const HARMONY_MODES: readonly ["complementary", "analogous", "triadic", "split-complementary", "tetradic", "monochromatic"];
export declare const DEFAULT_SEED: Hex;
export declare const DEFAULT_HARMONY: HarmonyMode;
export type RadiusScale = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";
export declare const RADIUS_MAP: Record<RadiusScale, {
    rem: string;
    label: string;
    px: string;
}>;
export declare const DEFAULT_RADIUS: RadiusScale;
/** The single length every `rounded-*` utility is a multiple of. */
export declare const RADIUS_BASE_VARIABLE = "--radius-base";
/**
 * Tailwind's own radius namespace, re-expressed as multiples of the base so the
 * whole scale moves together when the base does. At the default `md` base
 * (0.5rem) every step lands on the exact value Tailwind ships, so re-deriving
 * the scale is invisible until the user actually moves it. `--radius` is the
 * bare `rounded` utility; `rounded-full` stays a pill and is not on the scale.
 */
export declare const RADIUS_STEP_RATIOS: readonly (readonly [name: string, ratio: number])[];
export type RadiusVariable = {
    readonly name: string;
    readonly value: string;
};
export declare function radiusVariables(): RadiusVariable[];
/** Per-mode `--property: #hex` replacements, the shape `applyThemeOverrides` reads. */
export type PresetTokenOverrides = Readonly<Record<ThemeMode, Readonly<Record<string, string>>>>;
/**
 * A named starting point. `seed` and `harmony` are the whole preset whenever the
 * engine's rotations are the intent; `tokenOverrides` exists for the case they
 * are not — a preset whose secondary or status families own a chosen hue rather
 * than a derived one carries those ramps as overrides, because the engine has
 * exactly one seed to rotate from. Both are optional, so every preset written
 * against the older `{ name, seed, harmony }` shape still type-checks.
 */
export type PresetPalette = {
    readonly name: string;
    readonly seed: Hex;
    readonly harmony: HarmonyMode;
    readonly radius?: RadiusScale;
    readonly tokenOverrides?: PresetTokenOverrides;
};
export declare const PRESET_PALETTES: readonly PresetPalette[];
export declare const STATUS_PALETTES: readonly ["success", "warning", "danger", "info"];
export type StatusPaletteName = (typeof STATUS_PALETTES)[number];
export type AppPalette = {
    readonly seed: Hex;
    readonly harmony: HarmonyMode;
    readonly document: DtcgDocument;
    readonly ramps: Readonly<Record<AppPaletteName | StatusPaletteName, Ramp>>;
    readonly scales: Readonly<Record<AppPaletteName | StatusPaletteName, ShadeScale>>;
    readonly aliases: Readonly<Record<TailwindStep, StepLabel>>;
    readonly roles: Readonly<Record<ThemeMode, SemanticRoles>>;
};
/**
 * The expensive half of a theme: seven gamut-mapped ramps and both modes' role
 * tables. Independent of the active mode, so a light/dark toggle never rebuilds
 * it (`.agents/performance.md`).
 */
export declare function buildAppPalette(seed: Hex, harmony?: HarmonyMode): AppPalette;
/** The tinted label surfaces: a fill step plus a label step, one per status hue. */
export declare const BADGE_PALETTES: readonly ["primary", "success", "warning", "danger", "info"];
export type BadgePalette = (typeof BADGE_PALETTES)[number];
/** `--color-<palette>-<stop>`, identical in both modes: a ramp has no mode. */
export declare function paletteVariables(palette: AppPalette): ThemeVariable[];
export declare function semanticVariables(palette: AppPalette, mode: ThemeMode): ThemeVariable[];
/**
 * The roles the contrast solver may move, one per graded pair. Every entry owns
 * exactly one property in {@link ROLE_VARIABLES}.
 */
export declare const SOLVABLE_ROLES: readonly ["body", "body-surface", "muted", "subtle", "action", "action-secondary", "action-accent", "link", "brand", "badge", "focus", "focus-surface", "focus-offset", "focus-control", "border-subtle", "border-control", "success", "badge-success", "warning", "badge-warning", "danger", "badge-danger", "info", "badge-info"];
export type SolvableRole = (typeof SOLVABLE_ROLES)[number];
/**
 * Role to custom property. Injective by construction: no two roles share a
 * property, and no role writes a `--color-<palette>-<stop>` primitive step.
 */
export declare const ROLE_VARIABLES: Readonly<Record<SolvableRole, string>>;
export type AppTheme = AppPalette & {
    readonly mode: ThemeMode;
    readonly roles: Readonly<Record<ThemeMode, SemanticRoles>>;
    readonly primary: Hex;
    readonly secondary: Hex;
    readonly accent: Hex;
    readonly background: Hex;
    readonly surface: Hex;
    readonly foreground: Hex;
    readonly mutedForeground: Hex;
    readonly border: Hex;
    readonly focusRing: Hex;
    readonly success: Hex;
    readonly warning: Hex;
    readonly danger: Hex;
    readonly info: Hex;
    readonly elevation: readonly [Hex, Hex, Hex, Hex, Hex];
    /** What each solvable role currently resolves to, keyed the way pairs are. */
    readonly roleColors: Readonly<Record<SolvableRole, Hex>>;
    readonly badgeBackgrounds: Readonly<Record<BadgePalette, Hex>>;
    readonly variables: readonly ThemeVariable[];
};
/** The cheap half: picks one mode's roles out of an already-built palette. */
export declare function resolveAppTheme(palette: AppPalette, mode: ThemeMode): AppTheme;
/**
 * Applies CSS variable overrides to an AppTheme, updating its variables,
 * primitive shade scales (e.g. `--color-primary-800`), and semantic role fields.
 */
export declare function applyThemeOverrides(baseTokens: AppTheme, overrides: Record<string, string>): AppTheme;
export declare function buildAppTheme(seed: Hex, mode: ThemeMode, harmony?: HarmonyMode): AppTheme;
/**
 * A preset's theme for one mode. A preset carrying no overrides resolves to
 * exactly `buildAppTheme(seed, mode, harmony)`, so this is the single entry
 * point whether or not a preset needed to pin any family.
 */
export declare function buildPresetTheme(preset: PresetPalette, mode: ThemeMode): AppTheme;
export type ContrastRoleCategory = "text" | "border-subtle" | "border-control" | "focus" | "action-fill" | "badge-text";
export type AdjustableTarget = "foreground" | "background";
export type RoleThresholdConfig = {
    /**
     * The WCAG 2.2 success criterion the category is gated on, or `null` when the
     * role carries no information and is therefore exempt. A `null` criterion is
     * reported as exempt — never as a pass.
     */
    readonly criterion: string | null;
    /** `ratio` is the gate. `lc` is the APCA target, advisory only. */
    readonly aa: {
        readonly ratio: number;
        readonly lc: number;
    };
    readonly aaa: {
        readonly ratio: number;
        readonly lc: number;
    };
};
/**
 * What each role is actually held to, at the ratio its criterion actually
 * names.
 *
 * `border-subtle` is the purely decorative separator — a hairline between two
 * rows that carries no state and identifies no control. SC 1.4.11 exempts it,
 * so it is graded `exempt`, which is not the same claim as a pass. Every border
 * that bounds a control, marks a field, or carries meaning is `border-control`
 * and owes the real 3.0:1. The 1.8:1 this table used to call AA was neither.
 */
export declare const ROLE_THRESHOLDS: Record<ContrastRoleCategory, RoleThresholdConfig>;
/** `exempt` is a third answer, distinct from both `pass` and `fail`. */
export type ContrastVerdict = "pass" | "fail" | "exempt";
/**
 * The pairs a generated theme is held to. Both engines are reported, but only
 * the WCAG 2.2 ratio is the gate: `report.passes` and `verdict` are decided by
 * `wcag.ratio` alone, and APCA is advisory — it can neither rescue a pair whose
 * ratio falls short nor be waived to let one through.
 */
export type ThemeContrastPair = {
    readonly id: SolvableRole;
    readonly label: string;
    readonly mode: ThemeMode;
    readonly use: ContrastUse;
    readonly category: ContrastRoleCategory;
    readonly adjustableTarget: AdjustableTarget;
    readonly thresholds: RoleThresholdConfig;
    /** The one property solving this pair writes. Unique across the pair set. */
    readonly cssVariable: string;
    /**
     * What to render for this pair. Read this rather than `report.passes`: an
     * exempt role has a required ratio of 0, which `report.passes` satisfies
     * trivially and which must not be shown as a pass it earned.
     */
    readonly verdict: ContrastVerdict;
    readonly foreground: Hex;
    readonly background: Hex;
    readonly report: ContrastReport;
};
export declare function themeContrastPairs(theme: AppTheme): ThemeContrastPair[];
export type SeedGradeLevel = "AAA" | "AA" | "Partial" | "Fail";
export type SeedGrade = {
    readonly seed: Hex;
    readonly score: number;
    readonly level: SeedGradeLevel;
    readonly pairs: readonly ThemeContrastPair[];
    readonly failing: readonly ThemeContrastPair[];
};
/**
 * Grades a palette by what its *generated* theme achieves in both modes, not by
 * the seed colour in isolation: the engine solves the action stop and the
 * on-colours, so a raw hex says very little about the palette it produces.
 */
export declare function gradePalette(palette: AppPalette, tokenOverrides?: {
    light?: Record<string, string>;
    dark?: Record<string, string>;
}): SeedGrade;
export type SeedSuggestion = {
    readonly seed: Hex;
    readonly deltaE: number;
    readonly description: string;
};
export type AutoFixSeedResult = {
    readonly seed: Hex;
    readonly adjusted: boolean;
    readonly deltaE: number;
    readonly report: ContrastReport;
};
/**
 * Finds the nearest seed on the same hue and chroma line that clears the target
 * contrast against white action text (#ffffff). If the seed already passes, it is
 * returned unchanged with `adjusted: false` and `deltaE: 0`.
 */
export declare function autoFixSeedForContrast(seed: Hex, target?: "AA" | "AAA"): {
    seed: Hex;
    adjusted: boolean;
    deltaE: number;
    report: ContrastReport;
};
/**
 * The nearest seed on the same hue and chroma line that can serve as the action
 * fill at its own lightness, so the alias solver never has to darken `500` away
 * from the colour the user picked. Only lightness moves, for the same reason
 * the engine's own solver only moves lightness: hue and chroma are the brand.
 */
export declare function suggestSeed(seed: Hex): SeedSuggestion | null;
/**
 * The one property a solved role writes.
 *
 * It no longer depends on the mode: the mapping used to hand `link` and `badge`
 * the same primitive step, and both `body` variants the same `--foreground`, so
 * whichever pair was solved second silently overwrote the first one's fix. Each
 * role now owns a property nothing else writes, seeded from the value it used to
 * read. The second argument is kept so existing call sites keep compiling.
 */
export declare function getCssVariableForPair(pairId: string, _mode?: ThemeMode): string;
export type SolvedPairRoleResult = {
    readonly solvedHex: Hex;
    readonly cssVariable: string;
    readonly report: ContrastReport;
    readonly roleType: ContrastRoleCategory;
};
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
export type ContrastPairSolution = {
    readonly id: SolvableRole;
    readonly label: string;
    readonly originalFg: Hex;
    readonly solvedFg: Hex;
    readonly report: ContrastReport;
    readonly category: ContrastRoleCategory;
    readonly cssVariable: string;
    readonly verdict: ContrastVerdict;
};
/**
 * Solves all semantic contrast pairs in a theme according to their context and
 * role. Every solution names a different `cssVariable`, so the whole set can be
 * committed as one override map without any two entries fighting.
 *
 * Each fix is folded into the theme before the next pair is read, so a pair
 * measured against a role that was just solved — the focus ring against the
 * action fill, say — is graded against the fill it will actually sit on rather
 * than the one it started from.
 */
export declare function solveAllContrastPairs(theme: AppTheme, target?: "AA" | "AAA"): ContrastPairSolution[];
export type AutoFixThemeResult = {
    readonly fixedSeed: Hex;
    readonly pairSolutions: Record<string, {
        hex: Hex;
        report: ContrastReport;
        cssVariable: string;
    }>;
};
/**
 * Derives both the contrast-fixed seed and solutions for all failing pairs in the theme.
 */
export declare function autoFixTheme(theme: AppTheme, target?: "AA" | "AAA"): {
    fixedSeed: Hex;
    pairSolutions: Record<string, {
        hex: Hex;
        report: ContrastReport;
        cssVariable: string;
    }>;
};
export type ThemeStylesheetMeta = {
    readonly seed: Hex;
    readonly harmony: HarmonyMode;
};
/**
 * The single app-facing stylesheet emitter: the three colour blocks, the
 * app-facing alias layer and the `@theme inline` bridge, plus the `@import`
 * that pulls in the seed-independent `base.css` layer.
 *
 * This is the only implementation. `generateTheme(seed).css` returns it, and
 * `scripts/generate-tokens.ts` writes it to `src/styles/tokens.css` — there is
 * no second copy of this emission. Only the 11 public ramp stops
 * (50-950) are emitted: components reference exactly those, every value is a
 * literal so no alias can point at a dropped step, and `--format dtcg` already
 * carries the complete 26-step graph.
 *
 * Studio per-mode overrides are deliberately absent here. They are keyed by
 * the DTCG graph's variable names, which this vocabulary does not share, and
 * applying them would move the shipped dark values. The returned string has no
 * trailing newline; writers terminate it.
 */
export declare function buildThemeStylesheet(palette: AppPalette, meta: ThemeStylesheetMeta): string;
