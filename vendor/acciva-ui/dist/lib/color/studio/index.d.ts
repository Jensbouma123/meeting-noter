export type { RoleIntent, RoleIntentMap, RoleModeHexes, RoleResolution, RoleResolutionKind, StudioRole, } from "./types.js";
export { STUDIO_ROLES, studioRole, contextsFor, roleDependencyOrder } from "./gating.js";
export { surfaceScaleOf, rampForRole, roleHex, defaultIntentFor } from "./palette.js";
export { solveRoleIntent, splitIntent, unresolveIntent } from "./intent.js";
export { resolveRoles, arrivalRoles } from "./resolve.js";
export { baselineRoleHexes, roleOverridesFrom, tokenOverridesFrom } from "./overrides.js";
export { applyRoleOverrides } from "./regrade.js";
