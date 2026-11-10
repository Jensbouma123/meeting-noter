import { applyOverrides, flattenDocument } from "./resolve/index.js";
const DARK_SELECTOR = 'html[data-theme="dark"]';
const SYSTEM_DARK_SELECTOR = 'html:not([data-theme="light"])';
/**
 * Every custom property is declared twice: a hex fallback first, then the
 * `oklch()` value. Engines without CSS Color 4 keep the hex; engines with it
 * take the wider-gamut declaration that follows.
 */
function declarations(tokens, indent) {
    return tokens
        .map((token) => `${indent}${token.variable}: ${token.hex};\n${indent}${token.variable}: ${token.literal};`)
        .join("\n");
}
export function exportCssVariables(doc, overrides) {
    const flattened = flattenDocument(doc);
    const { primitive, light, dark } = applyOverrides(flattened, overrides ?? { light: {}, dark: {} });
    return [
        ":root {",
        declarations(primitive, "  "),
        "",
        declarations(light, "  "),
        "}",
        "",
        `${DARK_SELECTOR} {`,
        declarations(dark, "  "),
        "}",
        "",
        "@media (prefers-color-scheme: dark) {",
        `  ${SYSTEM_DARK_SELECTOR} {`,
        declarations(dark, "    "),
        "  }",
        "}",
        "",
    ].join("\n");
}
