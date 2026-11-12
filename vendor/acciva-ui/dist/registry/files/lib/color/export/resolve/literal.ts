import { isDtcgToken, type DtcgDocument, type DtcgGroup, type DtcgToken } from "@/lib/color/tokens/index";
import type { OKLCH } from "@/lib/color/types";

const MAX_ALIAS_DEPTH = 8;

function asGroup(doc: DtcgDocument): DtcgGroup {
  return doc as unknown as DtcgGroup;
}

function lookup(doc: DtcgDocument, path: readonly string[]): DtcgGroup | DtcgToken | undefined {
  let node: DtcgGroup | DtcgToken | undefined = asGroup(doc);
  for (const segment of path) {
    if (node === undefined || isDtcgToken(node)) return undefined;
    node = node[segment];
  }
  return node;
}

export function isAlias(value: string): boolean {
  return value.startsWith("{") && value.endsWith("}");
}

export function aliasPath(value: string): string[] {
  return value.slice(1, -1).split(".");
}

export function parseOklchLiteral(value: string): OKLCH {
  const match = /^oklch\(\s*([^\s]+)\s+([^\s]+)\s+([^\s)/]+)/i.exec(value.trim());
  if (match === null) throw new Error(`Not an oklch() literal: ${value}`);
  const [, rawL, rawC, rawH] = match as unknown as [string, string, string, string];
  return {
    l: parseComponent(rawL, 1),
    c: parseComponent(rawC, 0.4),
    h: parseComponent(rawH, 360),
  };
}

function parseComponent(raw: string, percentReference: number): number {
  if (raw === "none") return 0;
  if (raw.endsWith("%")) return (Number.parseFloat(raw) / 100) * percentReference;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Follows an alias chain such as `{color.primitive.brand.500}` to its literal. */
export function resolveLiteral(doc: DtcgDocument, token: DtcgToken): string {
  let value = token.$value;
  for (let depth = 0; isAlias(value); depth += 1) {
    if (depth >= MAX_ALIAS_DEPTH) throw new Error(`Alias chain too deep at ${token.$value}`);
    const target = lookup(doc, aliasPath(value));
    if (target === undefined || !isDtcgToken(target)) {
      throw new Error(`Unresolvable alias ${value}`);
    }
    value = target.$value;
  }
  return value;
}
