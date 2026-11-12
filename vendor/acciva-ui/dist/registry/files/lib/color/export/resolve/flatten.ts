import { oklchToHex } from "@/lib/color/space/index";
import { isDtcgToken, type DtcgDocument, type DtcgGroup, type DtcgToken } from "@/lib/color/tokens/index";
import { parseOklchLiteral, resolveLiteral } from "@/lib/color/export/resolve/literal";
import type { FlattenedDocument, FlatToken } from "@/lib/color/export/resolve/types";
import { cssVariableName } from "@/lib/color/export/resolve/variable";

function walk(
  node: DtcgGroup,
  prefix: readonly string[],
  out: { path: string[]; token: DtcgToken }[],
): void {
  for (const key of Object.keys(node)) {
    if (key.startsWith("$")) continue;
    const child = node[key];
    if (child === undefined) continue;
    if (isDtcgToken(child)) out.push({ path: [...prefix, key], token: child });
    else walk(child, [...prefix, key], out);
  }
}

function flattenGroup(doc: DtcgDocument, group: DtcgGroup, prefix: readonly string[]): FlatToken[] {
  const collected: { path: string[]; token: DtcgToken }[] = [];
  walk(group, prefix, collected);
  return collected.map(({ path, token }) => {
    const literal = resolveLiteral(doc, token);
    const color = parseOklchLiteral(literal);
    return {
      path,
      variable: cssVariableName(path),
      token,
      color,
      hex: oklchToHex(color),
      literal,
    };
  });
}

/** Flattens the graph into resolved, CSS-ready declarations grouped by mode. */
export function flattenDocument(doc: DtcgDocument): FlattenedDocument {
  return {
    primitive: flattenGroup(doc, doc.color.primitive, ["color", "primitive"]),
    light: [
      ...flattenGroup(doc, doc.color.semantic.light, ["color", "semantic", "light"]),
      ...flattenGroup(doc, doc.color.component.light, ["color", "component", "light"]),
    ],
    dark: [
      ...flattenGroup(doc, doc.color.semantic.dark, ["color", "semantic", "dark"]),
      ...flattenGroup(doc, doc.color.component.dark, ["color", "component", "dark"]),
    ],
  };
}
