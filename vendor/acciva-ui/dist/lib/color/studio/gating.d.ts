import { type RolePath } from "../audit/index.js";
import type { StudioRole } from "./types.js";
/**
 * Every role that gates export, in `REQUIRED_PAIRS` order. Exempt rows
 * (`foreground.disabled`, `border.subtle`) contribute no role: they are
 * measured and reported, never gated, so there is nothing for a designer to
 * resolve.
 */
export declare const STUDIO_ROLES: readonly StudioRole[];
export declare function studioRole(role: RolePath): StudioRole | undefined;
/**
 * The fixed colours a role is measured against, one per gating pair. A pair
 * names two roles and which one a solver may move; the other side is this
 * role's context, and it is read per mode because light and dark resolve their
 * roles independently.
 */
export declare function contextsFor(role: StudioRole): readonly RolePath[];
export declare function gatingDependenciesOf(role: StudioRole): readonly RolePath[];
export declare function roleDependencyOrder(): readonly StudioRole[];
