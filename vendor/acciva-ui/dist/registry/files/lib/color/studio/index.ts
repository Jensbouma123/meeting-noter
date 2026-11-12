export type {
  RoleIntent,
  RoleIntentMap,
  RoleModeHexes,
  RoleResolution,
  RoleResolutionKind,
  StudioRole,
} from "@/lib/color/studio/types";
export { STUDIO_ROLES, studioRole, contextsFor, roleDependencyOrder } from "@/lib/color/studio/gating";
export { surfaceScaleOf, rampForRole, roleHex, defaultIntentFor } from "@/lib/color/studio/palette";
export { solveRoleIntent, splitIntent, unresolveIntent } from "@/lib/color/studio/intent";
export { resolveRoles, arrivalRoles } from "@/lib/color/studio/resolve";
export { baselineRoleHexes, roleOverridesFrom, tokenOverridesFrom } from "@/lib/color/studio/overrides";
export { applyRoleOverrides } from "@/lib/color/studio/regrade";
