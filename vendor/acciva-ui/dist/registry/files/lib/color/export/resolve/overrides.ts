import { formatOklch, hexToOklch } from "@/lib/color/space/index";
import type { FlattenedDocument, FlatToken, ModeTokenOverrides } from "@/lib/color/export/resolve/types";

/**
 * Applies per-mode hex overrides to a flattened document, returning a new
 * document where every token whose CSS variable name appears in the overrides
 * map has its `hex` and `literal` replaced by the overridden value.
 *
 * Tokens whose variable name is not in the overrides map are copied verbatim.
 */
export function applyOverrides(
  doc: FlattenedDocument,
  overrides: ModeTokenOverrides,
): FlattenedDocument {
  const applyToMode = (mode: "light" | "dark"): readonly FlatToken[] => {
    const modeOverrides = overrides[mode];
    if (Object.keys(modeOverrides).length === 0) return doc[mode];
    return doc[mode].map((token): FlatToken => {
      const overrideHex = modeOverrides[token.variable];
      if (overrideHex === undefined) return token;
      const color = hexToOklch(overrideHex);
      return { ...token, color, hex: overrideHex, literal: formatOklch(color) };
    });
  };
  return {
    primitive: doc.primitive,
    light: applyToMode("light"),
    dark: applyToMode("dark"),
  };
}
