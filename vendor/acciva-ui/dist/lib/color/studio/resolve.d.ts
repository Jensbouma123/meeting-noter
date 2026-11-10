import type { AppPalette } from "../../theme-tokens/index.js";
import type { RoleIntentMap } from "./types.js";
export declare function resolveRoles(palette: AppPalette, decisions: RoleIntentMap): RoleIntentMap;
/**
 * The engine's answer to the seed, for every gating role, before the designer
 * has touched anything.
 *
 * It is derived from the palette rather than dispatched from step 2's render,
 * because a role's solve is not a designer decision: it is what `solveDualMode`
 * says about this seed, and it holds whether or not anyone has looked at the
 * row. Deriving it also means a converged role counts as resolved from the
 * solve rather than from having been displayed — step gating that waits on a
 * render pass is gating on the wrong thing.
 */
export declare function arrivalRoles(palette: AppPalette): RoleIntentMap;
