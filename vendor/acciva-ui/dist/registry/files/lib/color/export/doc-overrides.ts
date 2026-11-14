import { formatOklch, hexToOklch } from "@/lib/color/space/index";
import { cssVariableName, type FlatToken, type ModeTokenOverrides } from "@/lib/color/export/resolve/index";
import { isDtcgToken, type DtcgDocument, type DtcgGroup, type DtcgToken } from "@/lib/color/tokens/index";
import type { Hex } from "@/lib/color/types";

/**
 * Rebuilds a group with the `$value` of every token whose CSS variable name is
 * in `overrides` replaced by that hex, serialised as `oklch()`. Insertion order
 * is preserved so an override never reshuffles the emitted JSON.
 */
function overrideGroup(
  node: DtcgGroup,
  path: readonly string[],
  overrides: Readonly<Record<string, Hex>>,
): DtcgGroup {
  const rebuilt: Record<string, DtcgGroup | DtcgToken> = {};
  for (const key of Object.keys(node)) {
    const child = node[key];
    if (child === undefined) continue;
    if (key.startsWith("$")) {
      rebuilt[key] = child;
      continue;
    }
    const childPath = [...path, key];
    if (!isDtcgToken(child)) {
      rebuilt[key] = overrideGroup(child, childPath, overrides);
      continue;
    }
    const overrideHex = overrides[cssVariableName(childPath)];
    rebuilt[key] =
      overrideHex === undefined
        ? child
        : { ...child, $value: formatOklch(hexToOklch(overrideHex)) };
  }
  return rebuilt;
}

/**
 * Applies the overrides to the graph before any alias is resolved, so component
 * tokens that alias an overridden semantic token pick up the override too.
 */
export function withTokenOverrides(doc: DtcgDocument, overrides: ModeTokenOverrides): DtcgDocument {
  return {
    ...doc,
    color: {
      ...doc.color,
      semantic: {
        light: overrideGroup(doc.color.semantic.light, ["color", "semantic", "light"], overrides.light),
        dark: overrideGroup(doc.color.semantic.dark, ["color", "semantic", "dark"], overrides.dark),
      },
      component: {
        light: overrideGroup(doc.color.component.light, ["color", "component", "light"], overrides.light),
        dark: overrideGroup(doc.color.component.dark, ["color", "component", "dark"], overrides.dark),
      },
    },
  };
}

/**
 * Keeps the hex the caller typed as the fallback declaration. Round-tripping
 * through oklch would re-round it, so the flattened hex is pinned to the input.
 */
export function pinOverrideHex(
  tokens: readonly FlatToken[],
  overrides: Readonly<Record<string, Hex>>,
): readonly FlatToken[] {
  return tokens.map((token) => {
    const hex = overrides[token.variable];
    return hex === undefined ? token : { ...token, hex };
  });
}

export function hasEntries(overrides: ModeTokenOverrides | undefined): overrides is ModeTokenOverrides {
  if (overrides === undefined) return false;
  return Object.keys(overrides.light).length > 0 || Object.keys(overrides.dark).length > 0;
}
