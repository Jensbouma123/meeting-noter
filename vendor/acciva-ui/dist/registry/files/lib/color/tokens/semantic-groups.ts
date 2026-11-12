import type { SemanticRole, SemanticRoles } from "@/lib/color/semantic/index";
import type { DtcgGroup, DtcgToken } from "@/lib/color/tokens/types";

function roleToToken(semanticRole: SemanticRole): DtcgToken {
  return {
    $value: semanticRole.$value,
    $type: "color",
    $description: semanticRole.$description,
  };
}

export function rolesToGroup(roles: SemanticRoles): DtcgGroup {
  const group: Record<string, DtcgGroup> = {};
  for (const [groupName, members] of Object.entries(roles)) {
    const entries: Record<string, DtcgToken> = {};
    for (const [roleName, semanticRole] of Object.entries(members)) {
      entries[roleName] = roleToToken(semanticRole as SemanticRole);
    }
    group[groupName] = entries;
  }
  return group;
}
