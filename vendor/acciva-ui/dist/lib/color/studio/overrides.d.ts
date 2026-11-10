import type { ThemeAudit } from "../audit/index.js";
import { type ModeTokenOverrides } from "../export/resolve/index.js";
import type { RoleIntentMap, RoleModeHexes } from "./types.js";
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
 * The same movement as a `ModeTokenOverrides`, which is what the three emitters
 * take. `cssVariableName` drops the mode segment, so both modes address the
 * same property and a per-mode divergence lands as one entry per mode — which
 * is what per-mode overrides exist for.
 */
export declare function tokenOverridesFrom(overrides: RoleModeHexes): ModeTokenOverrides;
