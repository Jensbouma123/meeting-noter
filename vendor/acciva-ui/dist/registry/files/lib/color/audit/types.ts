import type { ApcaTier, ContrastUse, WcagLevel } from "@/lib/color/contrast/index";
import type {
  AccentRole,
  BackgroundRole,
  BorderRole,
  ForegroundRole,
  StatusRole,
} from "@/lib/color/semantic/index";
import type { TokenGraphOptions } from "@/lib/color/tokens/index";
import type { Hex, ThemeMode } from "@/lib/color/types";

/**
 * Addresses one semantic role as `group.role`. Mirrors the shape of
 * `SemanticRoles`, so a typo in the pair table is a type error rather than a
 * pair that silently never gets graded.
 */
export type RolePath =
  | `background.${BackgroundRole}`
  | `foreground.${ForegroundRole}`
  | `border.${BorderRole}`
  | `accent.${AccentRole}`
  | `status.${StatusRole}`;

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
  readonly apca: { readonly lc: number; readonly tier: ApcaTier };
};

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
