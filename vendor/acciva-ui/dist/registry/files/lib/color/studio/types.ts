import type { AaUse, RolePath } from "@/lib/color/audit/index";
import type { DualModeReason, DualModeSolution } from "@/lib/color/constrain/index";
import type { Hex, StepLabel, ThemeMode } from "@/lib/color/types";

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
export type RoleResolution =
  | { readonly kind: "converged"; readonly solution: DualModeSolution }
  | {
      readonly kind: "split";
      readonly solution: DualModeSolution;
      /** Non-null by construction: a split is only legal when both modes solve alone. */
      readonly light: StepLabel;
      readonly dark: StepLabel;
    }
  | {
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
