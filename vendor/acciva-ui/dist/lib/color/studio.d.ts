import { type AaUse, type RolePath, type ThemeAudit } from "./audit.js";
import { type DualModeReason, type DualModeSolution } from "./constrain.js";
import { type ModeTokenOverrides } from "./export/resolve.js";
import type { Hex, Ramp, StepLabel, ThemeMode } from "./types.js";
import type { AppPalette } from "../theme-tokens.js";
/**
 * A hex per role per mode — either what the graph holds or what a decision
 * moves it to. Sparse on purpose: an absent role means "unchanged", which is
 * what lets the audit re-grade only the rows an override actually touches.
 */
export type RoleModeHexes = Readonly<Record<ThemeMode, Readonly<Partial<Record<RolePath, Hex>>>>>;
/**
 * How a role's dual-mode solve came out.
 *
 * - `converged` — one ramp step clears AA against both backgrounds. `solution.step` is it.
 * - `split` — no shared step exists, and the designer chose to diverge per mode. Both
 *   steps are conformant in their own mode, so a split role is *resolved*: it does not
 *   block export, and the two steps become two `ModeTokenOverrides` entries.
 * - `unresolved` — the solve did not converge and no split has been recorded. This is the
 *   only state that blocks step 2's exit. A non-convergent solve is never rounded to a
 *   nearby colour to make it go away.
 *
 * Each variant carries the `DualModeSolution` it came from, so every ratio, `apcaLc` and
 * `reason` a row or the gate needs to print is already in the state — nothing is re-solved
 * to render it.
 */
export type RoleResolution = {
    readonly kind: "converged";
    readonly solution: DualModeSolution;
} | {
    readonly kind: "split";
    readonly solution: DualModeSolution;
    /** Non-null by construction: a split is only legal when both modes solve alone. */
    readonly light: StepLabel;
    readonly dark: StepLabel;
} | {
    readonly kind: "unresolved";
    readonly solution: DualModeSolution;
    readonly reason: DualModeReason;
};
export type RoleResolutionKind = RoleResolution["kind"];
/** One role's designer intent and the solve it produced. */
export type RoleIntent = {
    readonly role: RolePath;
    /** The step the designer addressed. The solver stays as close to it as AA allows. */
    readonly intent: StepLabel;
    readonly use: AaUse;
    readonly resolution: RoleResolution;
};
/**
 * Partial because the map is read at two altitudes. As the reducer holds it, an
 * entry is a decision the designer made and absence means they made none. As a
 * step reads it off `state.roles`, the hook has already layered those decisions
 * over the arrival solve for the current palette, so every
 * {@link STUDIO_ROLES} entry is present and absence cannot be observed.
 *
 * The two are not interchangeable, and which one a reader gets is the point:
 * resolution status is the merged view, so a converged role counts from the
 * solve rather than from having been rendered; the overrides that move the
 * theme are the decisions only, so nothing changes colour unasked.
 */
export type RoleIntentMap = Readonly<Partial<Record<RolePath, RoleIntent>>>;
/**
 * A role step 2 can address, with the floor it is held to. Derived from
 * `REQUIRED_PAIRS` rather than listed by hand, so a new pair in the engine
 * cannot leave a role unaddressable in the studio.
 */
export type StudioRole = {
    readonly role: RolePath;
    /** The strictest AA floor any gating pair holds this role to. */
    readonly use: AaUse;
    /** The `REQUIRED_PAIRS` ids this role gates, for linking a failure back to its row. */
    readonly pairIds: readonly string[];
};
/**
 * Every role that gates export, in `REQUIRED_PAIRS` order. Exempt rows
 * (`foreground.disabled`, `border.subtle`) contribute no role: they are
 * measured and reported, never gated, so there is nothing for a designer to
 * resolve.
 */
export declare const STUDIO_ROLES: readonly StudioRole[];
export declare function studioRole(role: RolePath): StudioRole | undefined;
/**
 * The elevation surfaces are cut from a `SurfaceScale` whose keys are the
 * elevation ladders, not ramp steps, so `AppPalette.ramps` does not carry it.
 * It is recovered from the roles that alias it — both modes, because the light
 * ladder (980/960/950/930) and the dark one (140…280) are disjoint halves of
 * the same scale. `solveDualMode` reads steps off the scale it is handed, so an
 * elevation role solves exactly the way a ramp role does.
 */
export declare function surfaceScaleOf(palette: AppPalette): Ramp;
/** The scale a role's value is drawn from — the vocabulary its solve may use. */
export declare function rampForRole(palette: AppPalette, path: RolePath): Ramp;
export declare function roleHex(palette: AppPalette, mode: ThemeMode, path: RolePath): Hex;
/**
 * The fixed colours a role is measured against, one per gating pair. A pair
 * names two roles and which one a solver may move; the other side is this
 * role's context, and it is read per mode because light and dark resolve their
 * roles independently.
 */
export declare function contextsFor(role: StudioRole): readonly RolePath[];
/** The role's own light-mode step: the designer's starting intent before any edit. */
export declare function defaultIntentFor(palette: AppPalette, path: RolePath): StepLabel;
/**
 * Solve one role across all of its contexts for both modes at once.
 */
export declare function solveRoleIntent(palette: AppPalette, role: StudioRole, intent: StepLabel, contextHex?: (role: RolePath, mode: ThemeMode) => Hex): RoleIntent;
/**
 * Record the per-mode divergence the designer chose. Legal only when both modes
 * solve alone, which is exactly `reason === "no-shared-step"` — the caller
 * checks, and a `null` step never becomes a colour.
 */
export declare function splitIntent(intent: RoleIntent): RoleIntent;
export declare function unresolveIntent(intent: RoleIntent): RoleIntent;
export declare function roleDependencyOrder(): readonly StudioRole[];
export declare function resolveRoles(palette: AppPalette, decisions: RoleIntentMap): RoleIntentMap;
/**
 * The engine's answer to the seed, for every gating role, before the designer
 * has touched anything.
 */
export declare function arrivalRoles(palette: AppPalette): RoleIntentMap;
/**
 * What the token graph already holds for every role a pair names, per mode.
 * Read back off the audit rather than off `palette.roles`, so the comparison is
 * against the colours that actually ship — alias indirection and export
 * rounding included — and costs nothing beyond the audit already computed.
 */
export declare function baselineRoleHexes(audit: ThemeAudit): RoleModeHexes;
/**
 * The per-mode values the designer's decisions move the theme to.
 *
 * Only `state.roles` — decisions the designer actually made — feeds this. The
 * arrival solve deliberately does not: it is anchored on the role's *light*
 * step, so its dark answer is the passing step nearest a light intent rather
 * than the one the theme already ships, and applying it unasked would move
 * every role and fail pairs that were passing. A proposal is not a change.
 *
 * A mode whose solved hex is the one the graph already holds contributes no
 * entry, so the export diff lists real movement only and the audit re-grades
 * nothing it does not have to.
 */
export declare function roleOverridesFrom(roles: RoleIntentMap, baseline: RoleModeHexes): RoleModeHexes;
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
/**
 * The same movement as a `ModeTokenOverrides`, which is what the three emitters
 * take. `cssVariableName` drops the mode segment, so both modes address the
 * same property and a per-mode divergence lands as one entry per mode — which
 * is what per-mode overrides exist for.
 */
export declare function tokenOverridesFrom(overrides: RoleModeHexes): ModeTokenOverrides;
