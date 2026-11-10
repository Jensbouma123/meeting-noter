import { formatOklch, hexToOklch } from "../../space/index.js";
/**
 * Applies per-mode hex overrides to a flattened document, returning a new
 * document where every token whose CSS variable name appears in the overrides
 * map has its `hex` and `literal` replaced by the overridden value.
 *
 * Tokens whose variable name is not in the overrides map are copied verbatim.
 */
export function applyOverrides(doc, overrides) {
    const applyToMode = (mode) => {
        const modeOverrides = overrides[mode];
        if (Object.keys(modeOverrides).length === 0)
            return doc[mode];
        return doc[mode].map((token) => {
            const overrideHex = modeOverrides[token.variable];
            if (overrideHex === undefined)
                return token;
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
